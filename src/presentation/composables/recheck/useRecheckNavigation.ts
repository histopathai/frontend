import { computed, ref, shallowRef, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useToast } from 'vue-toastification';
import { repositories } from '@/services';
import { useWorkspaceStore } from '@/stores/workspace';
import { usePatientStore } from '@/stores/patient';
import { useAnnotationStore } from '@/stores/annotation';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { useImageStore } from '@/stores/image';
import {
  groupByPatient,
  groupRechecks,
  type RecheckOutcome,
  type RecheckRequest,
} from '@/core/recheck';
import type { Image } from '@/core/entities/Image';
import type { Patient } from '@/core/entities/Patient';

const STORAGE_KEY_IMG = 'recheck_selected_image_id';
const STORAGE_KEY_WS = 'recheck_selected_workspace_id';
const STORAGE_KEY_HIDE = 'histo_hide_finished_recheck';

/**
 * Ek Kontrol: the list comes from the recheck requests, not from paging
 * through every patient. Like Veri Etiketleyici it shows one workspace at a
 * time, its patients and their images; an image opened here gets the same
 * workspace, annotation types and patient in the stores, so the viewer and
 * the metadata bar work unchanged.
 */
export function useRecheckNavigation() {
  const toast = useToast();
  const workspaceStore = useWorkspaceStore();
  const patientStore = usePatientStore();
  const annotationStore = useAnnotationStore();
  const annotationTypeStore = useAnnotationTypeStore();
  const imageStore = useImageStore();
  const { allWorkspaces } = storeToRefs(workspaceStore);

  const requests = ref<RecheckRequest[]>([]);
  const loadingList = ref(false);
  const loadingImage = ref(false);

  const hideDone = ref(localStorage.getItem(STORAGE_KEY_HIDE) !== 'false');
  watch(hideDone, (v) => localStorage.setItem(STORAGE_KEY_HIDE, String(v)));

  const selectedImageId = ref<string | undefined>(localStorage.getItem(STORAGE_KEY_IMG) || undefined);
  watch(selectedImageId, (id) =>
    id ? localStorage.setItem(STORAGE_KEY_IMG, id) : localStorage.removeItem(STORAGE_KEY_IMG)
  );
  const selectedImage = shallowRef<Image | null>(null);
  const selectedPatient = shallowRef<Patient | null>(null);

  /** A request finished while open stays listed until the user moves on. */
  const pinnedId = ref<string | undefined>(undefined);

  const selectedWsId = ref<string | undefined>(localStorage.getItem(STORAGE_KEY_WS) || undefined);
  watch(selectedWsId, (id) =>
    id ? localStorage.setItem(STORAGE_KEY_WS, id) : localStorage.removeItem(STORAGE_KEY_WS)
  );
  /** Patient whose images are open in the list. */
  const expandedPatientId = ref<string | undefined>(undefined);

  const workspaceName = (wsId: string) =>
    allWorkspaces.value.find((w) => w.id === wsId)?.name ?? wsId;

  const workspaceOrder = computed(() => allWorkspaces.value.map((w) => w.id));
  /** Every workspace with a request, with its counts, for the dropdown. */
  const workspaceGroups = computed(() => groupRechecks(requests.value, workspaceOrder.value, false));
  /** The selected workspace as listed (done ones out with "Bitenleri Gizle"). */
  const currentGroup = computed(
    () =>
      groupRechecks(requests.value, workspaceOrder.value, hideDone.value, pinnedId.value).find(
        (g) => g.wsId === selectedWsId.value
      ) ?? null
  );
  const patients = computed(() => groupByPatient(currentGroup.value?.requests ?? []));
  const visible = computed(() => patients.value.flatMap((p) => p.requests));
  const selectedRequest = computed(
    () => requests.value.find((r) => r.imageId === selectedImageId.value) ?? null
  );
  const selectedIndex = computed(() =>
    visible.value.findIndex((r) => r.imageId === selectedImageId.value)
  );
  const openCount = computed(() => requests.value.filter((r) => r.status === 'open').length);

  async function load() {
    loadingList.value = true;
    try {
      requests.value = await repositories.recheck.list();
    } catch (e: any) {
      toast.error(e?.message || 'Ek Kontrol listesi yüklenemedi');
    } finally {
      loadingList.value = false;
    }
  }

  let opening = 0;
  /** Workspace whose annotation types are in the store. */
  let typesOf: string | undefined;
  async function select(request: RecheckRequest) {
    if (request.imageId === selectedImageId.value && selectedImage.value) return;
    const run = ++opening;
    pinnedId.value = undefined;
    selectedWsId.value = request.wsId;
    expandedPatientId.value = request.patientId || `image:${request.imageId}`;
    selectedImageId.value = request.imageId;
    annotationStore.clearAnnotations();
    selectedImage.value = null;
    loadingImage.value = true;
    try {
      const workspace =
        allWorkspaces.value.find((w) => w.id === request.wsId) ??
        (await workspaceStore.fetchWorkspaceById(request.wsId, { showToast: false }));
      if (run !== opening) return;
      if (workspace) {
        workspaceStore.setCurrentWorkspace(workspace);
        if (typesOf !== workspace.id) {
          await annotationTypeStore.fetchAnnotationTypes(
            { limit: 100 },
            { refresh: true, parentId: workspace.id }
          );
          typesOf = workspace.id;
        }
      }
      const [image, patient] = await Promise.all([
        repositories.image.getById(request.imageId),
        request.patientId ? repositories.patient.getById(request.patientId) : Promise.resolve(null),
      ]);
      if (run !== opening) return;
      patientStore.setCurrentPatient(patient);
      // The store's current image: the metadata bar's actions (İşaretleme Tamamlandı,
      // Uygun değil) find the owner there and write their result back to it.
      imageStore.setCurrentImage(image);
      selectedPatient.value = patient;
      selectedImage.value = image;
    } catch (e: any) {
      if (run === opening) toast.error(e?.message || 'Görüntü açılamadı');
    } finally {
      if (run === opening) loadingImage.value = false;
    }
  }

  // An action of the metadata bar updated the open image: show the new copy.
  watch(
    () => imageStore.currentImage,
    (image) => {
      if (image && image.id === selectedImageId.value && image !== selectedImage.value) {
        selectedImage.value = image as Image;
      }
    }
  );

  function selectWorkspace(wsId: string) {
    if (wsId === selectedWsId.value) return;
    selectedWsId.value = wsId;
    selectedImage.value = null;
    selectedImageId.value = undefined;
    expandedPatientId.value = undefined;
  }

  function togglePatient(patientId: string) {
    expandedPatientId.value = expandedPatientId.value === patientId ? undefined : patientId;
  }

  function step(delta: number) {
    const next = visible.value[selectedIndex.value + delta];
    if (next) select(next);
  }

  /** Puts the server's copy of a request in the list (new, changed or reopened). */
  function upsert(updated: RecheckRequest) {
    const i = requests.value.findIndex((r) => r.imageId === updated.imageId);
    requests.value =
      i < 0
        ? [...requests.value, updated]
        : requests.value.map((r, k) => (k === i ? updated : r));
  }

  /** True when saved, so a dialog can close. */
  async function setDone(done: boolean, outcome?: RecheckOutcome, note = ''): Promise<boolean> {
    const request = selectedRequest.value;
    if (!request) return false;
    const wasUnsuitable = request.status === 'done' && request.outcome === 'unsuitable';
    try {
      upsert(await repositories.recheck.setDone(request.imageId, done, outcome, note));
      // The server set or cleared "Çalışmaya uygun değil" on the image: show it.
      if ((done && outcome === 'unsuitable') || wasUnsuitable) refreshImage(request.imageId);
      if (done) pinnedId.value = request.imageId;
      toast.success(done ? 'Kontrol tamamlandı' : 'Yeniden açıldı');
      return true;
    } catch (e: any) {
      toast.error(e?.message || 'Kaydedilemedi');
      return false;
    }
  }

  async function refreshImage(imageId: string) {
    try {
      const image = await repositories.image.getById(imageId);
      if (selectedImageId.value !== imageId) return;
      imageStore.setCurrentImage(image);
      selectedImage.value = image;
    } catch (e) {
      console.error('Failed to reload the image:', e);
    }
  }

  /** Admins: gives the open request to another pathologist. */
  async function assign(assigneeId: string): Promise<boolean> {
    const request = selectedRequest.value;
    if (!request) return false;
    try {
      upsert(await repositories.recheck.assign(request.imageId, assigneeId));
      toast.success('Atama değiştirildi');
      return true;
    } catch (e: any) {
      toast.error(e?.message || 'Atama değiştirilemedi');
      return false;
    }
  }

  /** Admins: takes the workspace's "dataset" reason off, then reloads the list. */
  async function withdrawWorkspace(wsId: string) {
    try {
      await repositories.recheck.withdrawWorkspace(wsId);
      if (selectedRequest.value?.wsId === wsId) {
        selectedImage.value = null;
      }
      await load();
      toast.success('Veri seti Ek Kontrol listesinden geri çekildi');
    } catch (e: any) {
      toast.error(e?.message || 'Geri çekilemedi');
    }
  }

  async function cancel() {
    const request = selectedRequest.value;
    if (!request) return;
    try {
      await repositories.recheck.cancel(request.imageId);
      const next = visible.value[selectedIndex.value + 1] ?? visible.value[selectedIndex.value - 1];
      requests.value = requests.value.filter((r) => r.imageId !== request.imageId);
      selectedImage.value = null;
      selectedImageId.value = undefined;
      if (next && next.imageId !== request.imageId) select(next);
      toast.success('Ek Kontrol listesinden çıkarıldı');
    } catch (e: any) {
      toast.error(e?.message || 'Çıkarılamadı');
    }
  }

  // A workspace to show: the stored one, the stored image's, or the first with work left.
  watch(workspaceGroups, (groups) => {
    if (groups.length === 0 || groups.some((g) => g.wsId === selectedWsId.value)) return;
    const stored = requests.value.find((r) => r.imageId === selectedImageId.value);
    selectedWsId.value = stored?.wsId ?? (groups.find((g) => g.open > 0) ?? groups[0]!).wsId;
  });

  // First visit, another workspace, or the last image is gone: open the first one in the list.
  watch(visible, (list) => {
    if (loadingList.value || list.length === 0) return;
    if (selectedImage.value && selectedRequest.value) return;
    const stored = list.find((r) => r.imageId === selectedImageId.value);
    select(stored ?? list[0]!);
  });

  workspaceStore.fetchAllWorkspaces().catch(() => {});
  load();

  return {
    requests,
    allWorkspaces,
    workspaceGroups,
    currentGroup,
    patients,
    visible,
    selectedWsId,
    expandedPatientId,
    selectWorkspace,
    togglePatient,
    openCount,
    loadingList,
    loadingImage,
    hideDone,
    workspaceName,
    selectedImageId,
    selectedImage,
    selectedPatient,
    selectedRequest,
    selectedIndex,
    select,
    next: () => step(1),
    prev: () => step(-1),
    upsert,
    setDone,
    cancel,
    withdrawWorkspace,
    assign,
    reload: load,
  };
}
