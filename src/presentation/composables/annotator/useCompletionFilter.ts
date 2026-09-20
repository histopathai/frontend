import { computed, ref, shallowRef, watch, type Ref } from 'vue';
import { repositories } from '@/services';
import { useImageStore } from '@/stores/image';
import type { Image } from '@/core/entities/Image';
import type { Patient } from '@/core/entities/Patient';
import type { Workspace } from '@/core/entities/Workspace';
import type { TissueMaskStatus } from '@/core/entities/TissueMask';
import {
  isImageFinished as imageFinished,
  isProgressFinished,
  progressOf,
  type CompletionMode,
  type Progress,
} from '@/core/completion';

interface Sources {
  workspaces: Ref<Workspace[]>;
  patients: Ref<Patient[]>;
  images: Ref<Image[]>;
  selectedWorkspaceId: Ref<string | undefined>;
  selectedPatientId: Ref<string | undefined>;
  selectedImageId: Ref<string | undefined>;
}

const PAGE = 100;

async function inBatches<T>(items: T[], size: number, run: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(size, queue.length) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await run(item);
  });
  await Promise.all(workers);
}

async function allPages(
  load: (offset: number) => Promise<{ data: Image[]; pagination?: any }>,
  stop?: (page: Image[]) => boolean
): Promise<Image[]> {
  const images: Image[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const result = await load(offset);
    images.push(...result.data);
    const hasMore =
      result.pagination?.hasMore ?? result.pagination?.has_more ?? result.data.length === PAGE;
    if (!hasMore || result.data.length === 0 || stop?.(result.data)) return images;
  }
}

/**
 * The one "Bitenleri Gizle" switch of a tab: what is finished is decided from
 * what the server says now, never from a list remembered in the browser, so a
 * dataset cannot stay hidden after it got new work.
 */
export function useCompletionFilter(mode: CompletionMode, sources: Sources) {
  const imageStore = useImageStore();
  const storageKey = `histo_hide_finished_${mode}`;

  const hideFinished = ref(mode !== 'none' && localStorage.getItem(storageKey) === 'true');
  watch(hideFinished, (value) => localStorage.setItem(storageKey, String(value)));

  const filtering = computed(() => mode !== 'none' && hideFinished.value);

  // --- Tissue masks of the selected workspace ---------------------------------

  const maskStatuses = shallowRef<Map<string, TissueMaskStatus>>(new Map());
  /** Workspace whose masks are in `maskStatuses`; images are not judged before that. */
  const masksOf = ref<string | undefined>(undefined);

  const maskStatus = (imageId: string) => maskStatuses.value.get(imageId);

  function setMaskStatus(imageId: string, status: TissueMaskStatus | undefined) {
    if (maskStatuses.value.get(imageId) === status) return;
    const next = new Map(maskStatuses.value);
    if (status) next.set(imageId, status);
    else next.delete(imageId);
    maskStatuses.value = next;
  }

  async function loadMasks(workspaceId: string) {
    try {
      const summaries = await repositories.tissueMask.listByWorkspace(workspaceId);
      if (sources.selectedWorkspaceId.value !== workspaceId) return;
      maskStatuses.value = new Map(summaries.map((s) => [s.imageId, s.status]));
      masksOf.value = workspaceId;
    } catch (e) {
      console.error('Failed to load the tissue masks of the workspace:', e);
    }
  }

  const ready = computed(
    () => mode !== 'tissue' || masksOf.value === sources.selectedWorkspaceId.value
  );

  // --- Images of each listed patient -------------------------------------------

  const patientImages = shallowRef<Map<string, Image[]>>(new Map());
  const requested = new Set<string>();

  /** The store's copy of an image is newer: marking it as completed updates that one. */
  function withLive(patientId: string, fetched: Image[]): Image[] {
    const live = imageStore.imagesByPatient.get(patientId) as Image[] | undefined;
    if (!live?.length) return fetched;
    const liveById = new Map(live.map((img) => [img.id, img]));
    return fetched.map((img) => liveById.get(img.id) ?? img);
  }

  // Kept here as well, because the store drops the images when another patient
  // is opened — and the patient just finished must not come back as unfinished.
  watch(
    () => imageStore.imagesByPatient,
    (live) => {
      let next: Map<string, Image[]> | undefined;
      for (const patientId of live.keys()) {
        const fetched = patientImages.value.get(patientId);
        if (!fetched) continue;
        const merged = withLive(patientId, fetched);
        if (merged.some((img, i) => img !== fetched[i])) {
          next ??= new Map(patientImages.value);
          next.set(patientId, merged);
        }
      }
      if (next) patientImages.value = next;
    },
    // Opening the next patient clears the store right after the update.
    { flush: 'sync' }
  );

  async function loadPatientImages(patients: Patient[], workspaceId: string | undefined) {
    const missing = patients.filter((p) => !requested.has(p.id));
    missing.forEach((p) => requested.add(p.id));
    await inBatches(missing, 4, async (patient) => {
      try {
        const images = await allPages((offset) =>
          repositories.image.listByPatient(patient.id, { pagination: { limit: PAGE, offset } })
        );
        if (sources.selectedWorkspaceId.value !== workspaceId) return;
        patientImages.value = new Map(patientImages.value).set(
          patient.id,
          withLive(patient.id, images)
        );
      } catch (e) {
        requested.delete(patient.id);
        console.error('Failed to load the images of the patient:', e);
      }
    });
  }

  watch(
    sources.selectedWorkspaceId,
    (workspaceId) => {
      patientImages.value = new Map();
      requested.clear();
      maskStatuses.value = new Map();
      masksOf.value = undefined;
      if (workspaceId && mode === 'tissue') loadMasks(workspaceId);
    },
    { immediate: true }
  );

  watch(
    sources.patients,
    (patients) => loadPatientImages(patients, sources.selectedWorkspaceId.value),
    { immediate: true }
  );

  function patientProgress(patientId: string): Progress | undefined {
    const images = patientImages.value.get(patientId);
    if (!images || !ready.value) return undefined;
    return progressOf(mode, images, maskStatus);
  }

  // --- Finished workspaces -------------------------------------------------------

  const finishedWorkspaces = shallowRef<Set<string>>(new Set());
  let scan = 0;

  /** Stops at the first image with work left, so an unfinished dataset costs one request. */
  async function isLabelingFinished(workspaceId: string): Promise<boolean> {
    const unfinished = (page: Image[]) => page.some((img) => !img.markedAsCompleted);
    const images = await allPages(
      (offset) =>
        repositories.image.listByWorkspace(workspaceId, { pagination: { limit: PAGE, offset } }),
      unfinished
    );
    return images.length > 0 && !unfinished(images);
  }

  async function scanWorkspaces() {
    const run = ++scan;
    const workspaces = sources.workspaces.value;
    try {
      if (mode === 'tissue') {
        const stats = await repositories.tissueMask.getWorkspaceStats();
        if (run !== scan) return;
        finishedWorkspaces.value = new Set(
          stats.filter((s) => s.totalImages > 0 && s.remaining === 0).map((s) => s.workspaceId)
        );
        return;
      }
      const finished = new Set<string>();
      await inBatches(workspaces, 3, async (ws) => {
        try {
          if (await isLabelingFinished(ws.id)) finished.add(ws.id);
        } catch (e) {
          console.error(`Failed to check whether workspace ${ws.id} is finished:`, e);
        }
      });
      if (run === scan) finishedWorkspaces.value = finished;
    } catch (e) {
      console.error('Failed to load the finished workspaces:', e);
    }
  }

  watch(
    [filtering, () => sources.workspaces.value.length],
    ([active, count]) => {
      if (active && count > 0) scanWorkspaces();
    },
    { immediate: true }
  );

  // --- What the sidebar lists ------------------------------------------------------

  /**
   * An image that turned finished while it was open stays listed until the user
   * moves on; one that was already finished when it got selected does not.
   */
  const pinnedImageId = ref<string | undefined>(undefined);

  function isImageFinished(image: Image): boolean {
    return ready.value && imageFinished(mode, image, maskStatus);
  }

  watch(sources.selectedImageId, () => (pinnedImageId.value = undefined));
  watch(
    (): [string | undefined, boolean | undefined] => {
      const image = sources.images.value.find((img) => img.id === sources.selectedImageId.value);
      // Unknown until the masks are in: loading them must not look like finishing.
      return [image?.id, image && ready.value ? isImageFinished(image) : undefined];
    },
    ([id, finished], [oldId, wasFinished]) => {
      if (id && id === oldId && finished && wasFinished === false) pinnedImageId.value = id;
    },
    // Before the lists below are read again, or the image would blink out first.
    { flush: 'sync' }
  );

  function isImageVisible(image: Image): boolean {
    return !filtering.value || !isImageFinished(image) || image.id === pinnedImageId.value;
  }

  function isPatientVisible(patient: Patient): boolean {
    if (!filtering.value) return true;
    if (pinnedImageId.value && patient.id === sources.selectedPatientId.value) return true;
    const progress = patientProgress(patient.id);
    // Not known yet: keep it rather than hide a patient that may have work left.
    return !progress || !isProgressFinished(mode, progress);
  }

  /** Known to have work left; an unknown patient is listed but not chosen automatically. */
  function hasWorkLeft(patient: Patient): boolean {
    const progress = patientProgress(patient.id);
    return !!progress && !isProgressFinished(mode, progress);
  }

  const visibleWorkspaces = computed(() =>
    filtering.value
      ? sources.workspaces.value.filter(
          (ws) => !finishedWorkspaces.value.has(ws.id) || ws.id === sources.selectedWorkspaceId.value
        )
      : sources.workspaces.value
  );
  const visiblePatients = computed(() => sources.patients.value.filter(isPatientVisible));
  const visibleImages = computed(() => sources.images.value.filter(isImageVisible));

  return {
    mode,
    hideFinished,
    filtering,
    ready,
    visibleWorkspaces,
    visiblePatients,
    visibleImages,
    isImageFinished,
    isImageVisible,
    isPatientVisible,
    hasWorkLeft,
    patientProgress,
    setMaskStatus,
  };
}
