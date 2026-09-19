import { computed, onUnmounted, reactive, ref, shallowRef, watch } from 'vue';
import type { Image } from '@/core/entities/Image';
import type { TissueMask } from '@/core/entities/TissueMask';
import {
  DEFAULT_THRESHOLDS,
  NO_CHOICE,
  annotators as listAnnotators,
  chooseAnnotator,
  neighbourImage,
  describeSpec,
  filterCells,
  isUpsampled,
  patchSpec,
  patchSummary,
  pythonSnippet,
  select,
  type AnnotationInput,
  type Annotator,
  type CatalogSet,
  type LabelSetChoice,
  type LabelSet,
  type PatchCells,
  type PatchParams,
  type PatchSpec,
} from '@/core/patches';
import type {
  PatchWorkerRequest,
  PatchWorkerResponse,
  PatchWorkerResult,
} from '@/presentation/workers/patchGrid.worker';
import { repositories } from '@/services';
import { useAnnotationStore } from '@/stores/annotation';

export type ColorBy = 'label' | 'coverage' | 'purity' | 'tissueCoverage' | 'inside';

/** Whose labels and of which type (`LabelSetChoice`) is part of the settings: it belongs to the workspace. */
export interface PatchGridSettings extends PatchParams, LabelSetChoice {
  colorBy: ColorBy;
}

const DEFAULT_SETTINGS: PatchGridSettings = {
  patchSize: 512,
  mpp: 0.5,
  overlap: 0,
  source: 'tissue',
  placement: 'grid',
  merge: false,
  ...DEFAULT_THRESHOLDS,
  colorBy: 'coverage',
  ...NO_CHOICE,
};

const STORAGE_PREFIX = 'patch-grid:settings:';
const PAGE = 100; // main-service caps a page at 100

function loadSettings(workspaceId: string | null): PatchGridSettings {
  if (!workspaceId) return { ...DEFAULT_SETTINGS };
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_PREFIX + workspaceId) || 'null') ?? {};
    // Saved by the first release as one key, `${ownerId}\u0000${annotationTypeId}`.
    const { labelSetKey, ...rest } = stored;
    if (typeof labelSetKey === 'string' && !rest.ownerId) {
      [rest.ownerId, rest.annotationTypeId] = labelSetKey.split('\u0000');
    }
    delete rest.ownerName;
    delete rest.annotationTypeName;
    return { ...DEFAULT_SETTINGS, ...rest };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Wraps the worker: only the latest compute request resolves, superseded ones reject. */
function usePatchGridWorker() {
  const worker = new Worker(new URL('../../workers/patchGrid.worker.ts', import.meta.url), {
    type: 'module',
  });
  let nextRequestId = 0;
  let pending: {
    id: number;
    resolve: (r: PatchWorkerResult) => void;
    reject: (e: Error) => void;
  } | null = null;

  let geometry: { imageKey: string; resolve: (sets: LabelSet[]) => void } | null = null;

  worker.onmessage = (event: MessageEvent<PatchWorkerResponse>) => {
    const msg = event.data;
    if (msg.type === 'geometry') {
      if (geometry?.imageKey === msg.imageKey) geometry.resolve(msg.labelSets);
      return;
    }
    if (!pending || msg.requestId !== pending.id) return;
    const { resolve, reject } = pending;
    pending = null;
    if (msg.type === 'result') resolve(msg.result);
    else reject(new Error(msg.message));
  };

  /**
   * Sends the geometry of an image; resolves with its label sets once the worker
   * has built them. A request for an image the user already left never resolves
   * — its caller has moved on too.
   */
  function setGeometry(
    msg: Omit<Extract<PatchWorkerRequest, { type: 'setGeometry' }>, 'type'>
  ): Promise<LabelSet[]> {
    return new Promise((resolve) => {
      geometry = { imageKey: msg.imageKey, resolve };
      worker.postMessage({ type: 'setGeometry', ...msg });
    });
  }

  function compute(
    msg: Omit<Extract<PatchWorkerRequest, { type: 'compute' }>, 'type' | 'requestId'>
  ): Promise<PatchWorkerResult> {
    pending?.reject(new Error('superseded'));
    const id = ++nextRequestId;
    return new Promise((resolve, reject) => {
      pending = { id, resolve, reject };
      worker.postMessage({ type: 'compute', requestId: id, ...msg });
    });
  }

  onUnmounted(() => {
    pending?.reject(new Error('superseded'));
    worker.terminate();
  });

  return { setGeometry, compute };
}

/**
 * State of the patch grid tab for one image at a time: what is loaded, the
 * parameters, the candidates the worker returned and which of them pass the
 * thresholds. Nothing here writes to the server.
 */
export function usePatchGrid() {
  const annotationStore = useAnnotationStore();
  const worker = usePatchGridWorker();

  const settings = reactive<PatchGridSettings>({ ...DEFAULT_SETTINGS });
  let settingsWorkspace: string | null = null;

  const image = shallowRef<Image | null>(null);
  const mask = shallowRef<TissueMask | null>(null);
  const sets = shallowRef<LabelSet[]>([]);
  const slideSize = shallowRef<{ width: number; height: number } | null>(null);

  const loading = ref(false);
  const loadedAnnotations = ref(0);
  const loadError = ref<string | null>(null);
  const computing = ref(false);
  const computeError = ref<string | null>(null);
  const cells = shallowRef<PatchCells | null>(null);
  const crowded = shallowRef<PatchWorkerResult['crowded']>(null);
  const unresolved = ref(0);
  const elapsedMs = ref(0);
  let geometryKey = '';

  // A rejected mask marks the image as unusable for tissue work; it is never used.
  const tissueUsable = computed(() => !!mask.value && mask.value.status !== 'rejected');
  const baseMpp = computed(() => image.value?.mpp ?? null);

  const spec = computed<PatchSpec | null>(() => {
    if (!baseMpp.value) return null;
    try {
      return patchSpec(settings.patchSize, settings.mpp, baseMpp.value, settings.overlap);
    } catch {
      return null;
    }
  });
  const specText = computed(() => (spec.value ? describeSpec(spec.value) : ''));
  const upsampled = computed(() => !!spec.value && isUpsampled(spec.value));

  // ── whose labels, of which type ─────────────────────────────────────────────
  //
  // The choice is made from the annotators of the workspace (what dev-ingestor's
  // `label_sets(ds)` lists), not from whoever drew on the image on screen: in a
  // workspace where no image has two annotators, a list per image has a single
  // entry and nothing to switch to. Labels of different annotators are never
  // evaluated together; an image the chosen annotator did not label gives no
  // patches, as in dev-ingestor.

  /** Label sets of the workspace from main-service; null until loaded, or when the server lacks the endpoint. */
  const workspaceSets = shallowRef<CatalogSet[] | null>(null);
  const catalogLoading = ref(false);

  const catalog = computed<CatalogSet[]>(
    () =>
      workspaceSets.value ??
      // A main-service one release behind: only the image on screen is known.
      sets.value.map((s) => ({
        ownerId: s.ownerId,
        owner: s.owner,
        annotationTypeId: s.annotationTypeId,
        annotationType: s.annotationType,
        resource: s.resource,
        polygons: s.polygons.length,
        imageIds: null,
      }))
  );
  const annotators = computed<Annotator[]>(() => listAnnotators(catalog.value));
  const selection = computed(() => select(catalog.value, settings));
  /** The annotator whose types are on offer: the chosen one, or the one still missing a type. */
  const annotator = computed(() =>
    'annotator' in selection.value ? selection.value.annotator : null
  );
  const chosenSet = computed(() =>
    selection.value.status === 'chosen' ? selection.value.set : null
  );
  /** The chosen label set as it is on this image: the polygons the patches are made from. */
  const labelSet = computed(() => {
    const chosen = chosenSet.value;
    if (!chosen) return null;
    return (
      sets.value.find(
        (s) => s.ownerId === chosen.ownerId && s.annotationTypeId === chosen.annotationTypeId
      ) ?? null
    );
  });

  function pickAnnotator(ownerId: string) {
    const target = annotators.value.find((a) => a.ownerId === ownerId);
    if (target) Object.assign(settings, chooseAnnotator(target, settings));
  }
  function pickType(annotationTypeId: string) {
    const owner = annotator.value;
    if (owner) Object.assign(settings, { ownerId: owner.ownerId, annotationTypeId });
  }

  /** "Selva Kabul · Gleason Pattern" — which annotator the patches on screen were made with. */
  const provenance = computed(() =>
    settings.source === 'annotation' && chosenSet.value
      ? {
          owner: chosenSet.value.owner,
          annotationType: chosenSet.value.annotationType,
          resource: chosenSet.value.resource,
        }
      : null
  );

  /** Where the chosen annotator has labels, for going there from an image without any. */
  const imagesWithSet = computed(() => {
    const ids = chosenSet.value?.imageIds;
    if (!ids) return null;
    const at = image.value ? ids.indexOf(image.value.id) : -1;
    return { total: ids.length, position: at === -1 ? null : at + 1 };
  });
  const neighbour = (step: 1 | -1) =>
    chosenSet.value ? neighbourImage(chosenSet.value, image.value?.id ?? null, step) : null;

  async function loadCatalog(workspaceId: string) {
    workspaceSets.value = null;
    catalogLoading.value = true;
    try {
      const rows = await repositories.annotation.labelSetsByWorkspace(workspaceId);
      if (settingsWorkspace !== workspaceId || !rows) return;

      // Named the way dev-ingestor names them, so that the copied owner= and
      // annotation_type= select the same label set there.
      const people = rows.filter((r) => !r.resources.includes('imported')).map((r) => r.creatorId);
      const unnamed = [...new Set(rows.filter((r) => !r.name).map((r) => r.annotationTypeId))];
      const typeNames: Record<string, string> = {};
      await Promise.all([
        annotationStore.resolveCreatorNames(people),
        ...unnamed.map(async (id) => {
          try {
            typeNames[id] = (await repositories.annotationType.getById(id)).name;
          } catch {
            // The id stands in for the name, as it does in dev-ingestor.
          }
        }),
      ]);
      if (settingsWorkspace !== workspaceId) return;

      const ownerName = (r: (typeof rows)[number]) =>
        annotationStore.userNames[r.creatorId] ||
        (r.resources.includes('imported') ? 'imported' : r.creatorId);
      const nameCount = new Map<string, Set<string>>();
      for (const r of rows) {
        const name = ownerName(r);
        if (!nameCount.has(name)) nameCount.set(name, new Set());
        nameCount.get(name)!.add(r.creatorId);
      }
      workspaceSets.value = rows.map((r) => {
        const name = ownerName(r);
        return {
          ownerId: r.creatorId,
          // Two ids sharing one name are kept apart, as dev-ingestor does.
          owner: nameCount.get(name)!.size > 1 ? `${name} [${r.creatorId}]` : name,
          annotationTypeId: r.annotationTypeId,
          annotationType: r.name || typeNames[r.annotationTypeId] || r.annotationTypeId,
          resource: [...r.resources].sort().join('|'),
          polygons: r.polygonCount,
          imageIds: r.imageIds,
        };
      });
    } catch {
      // The choice then works from the image on screen; loading the image reports its own errors.
    } finally {
      if (settingsWorkspace === workspaceId) catalogLoading.value = false;
    }
  }

  /** Polygons of the chosen label set are smaller than the patch: a grid cannot label them. */
  const polygonsSmallerThanPatch = computed(() => {
    const side = labelSet.value?.sideUm;
    return !!side && side < settings.patchSize * settings.mpp;
  });

  /** Why there is nothing to show, in the user's terms; null when a grid can be computed. */
  const blocker = computed<string | null>(() => {
    // While loading, "no mask" and "no annotations" are not known yet.
    if (!image.value || loading.value) return null;
    if (loadError.value) return loadError.value;
    if (!baseMpp.value) {
      return 'Bu görüntünün mpp değeri yok; patch hedefi µm/piksel ile tanımlandığı için ızgara hesaplanamaz.';
    }
    if (!spec.value)
      return 'Patch hedefi geçersiz: patch_size ve mpp pozitif, overlap 0–1 arasında olmalı.';
    if (settings.source === 'tissue') {
      if (!mask.value) return 'Bu görüntünün doku maskesi yok.';
      if (!tissueUsable.value)
        return 'Doku maskesi reddedilmiş; reddedilen maske patch üretiminde kullanılmaz.';
    } else {
      const chosen = selection.value;
      if (catalogLoading.value && chosen.status !== 'chosen') return null;
      if (chosen.status === 'empty') return "Bu workspace'te poligonlu annotation yok.";
      if (chosen.status === 'choose-annotator')
        return "Annotator seçin: patch'ler tek bir annotator'ın etiketlerinden çıkarılır.";
      if (chosen.status === 'choose-type')
        return `${chosen.annotator.owner} için annotation türünü seçin.`;
      if (!labelSet.value) {
        const where = imagesWithSet.value
          ? ` Bu workspace'te ${imagesWithSet.value.total} görüntüde var.`
          : '';
        return `${chosen.set.owner} bu görüntüde "${chosen.set.annotationType}" türünde poligon çizmemiş; dev-ingestor bu görüntüyü atlar.${where}`;
      }
    }
    return null;
  });

  const kept = computed(() =>
    cells.value ? filterCells(cells.value, settings) : new Uint32Array(0)
  );
  const summary = computed(() => (cells.value ? patchSummary(cells.value, kept.value) : []));
  const snippet = computed(() =>
    pythonSnippet(
      settings,
      chosenSet.value && {
        owner: chosenSet.value.owner,
        annotationType: chosenSet.value.annotationType,
      }
    )
  );

  // ── loading ────────────────────────────────────────────────────────────────

  async function fetchAnnotations(
    imageId: string,
    isCurrent: () => boolean
  ): Promise<AnnotationInput[]> {
    const out: AnnotationInput[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const page = await repositories.annotation.listByImage(imageId, {
        pagination: { limit: PAGE, offset } as any,
      });
      if (!isCurrent()) return out;
      for (const a of page.data) {
        out.push({
          id: a.id,
          name: a.name,
          value: a.value,
          annotationTypeId: a.annotationTypeId,
          creatorId: a.creatorId,
          resource: a.resource,
          isGlobal: a.isGlobal,
          // Plain points: entity value objects do not survive the trip to the worker.
          polygon: a.polygon.map((p) => ({ x: p.x, y: p.y })),
        });
      }
      loadedAnnotations.value = out.length;
      const more = (page.pagination as any)?.has_more ?? (page.pagination as any)?.hasMore;
      if (page.data.length < PAGE || more === false) return out;
    }
  }

  /** Type names are only needed where the annotations of a type disagree on their own `name`. */
  async function typeNamesFor(annotations: AnnotationInput[]): Promise<Record<string, string>> {
    const names = new Map<string, Set<string>>();
    for (const a of annotations) {
      if (a.isGlobal || a.polygon.length < 3) continue;
      if (!names.has(a.annotationTypeId)) names.set(a.annotationTypeId, new Set());
      names.get(a.annotationTypeId)!.add(a.name);
    }
    const out: Record<string, string> = {};
    await Promise.all(
      [...names]
        .filter(([, n]) => n.size !== 1)
        .map(async ([id]) => {
          try {
            out[id] = (await repositories.annotationType.getById(id)).name;
          } catch {
            // The id stands in for the name, as it does in dev-ingestor.
          }
        })
    );
    return out;
  }

  async function load(next: Image | null) {
    image.value = next;
    mask.value = null;
    sets.value = [];
    cells.value = null;
    crowded.value = null;
    loadError.value = null;
    computeError.value = null;
    loadedAnnotations.value = 0;
    slideSize.value =
      next?.width && next?.height ? { width: next.width, height: next.height } : null;
    geometryKey = '';
    if (!next) return;

    if (next.wsId !== settingsWorkspace) {
      settingsWorkspace = next.wsId;
      Object.assign(settings, loadSettings(next.wsId));
      // Not awaited: the annotators of the workspace arrive while the image loads.
      void loadCatalog(next.wsId);
    }

    const isCurrent = () => image.value?.id === next.id;
    loading.value = true;
    try {
      const [loadedMask, annotations] = await Promise.all([
        repositories.tissueMask.getByImage(next.id),
        fetchAnnotations(next.id, isCurrent),
      ]);
      if (!isCurrent()) return;

      const regional = annotations.filter((a) => !a.isGlobal && a.polygon.length >= 3);
      const [typeNames] = await Promise.all([
        typeNamesFor(regional),
        annotationStore.resolveCreatorNames(
          regional.filter((a) => a.resource !== 'imported').map((a) => a.creatorId)
        ),
      ]);
      if (!isCurrent()) return;

      // A rejected mask marks the image as unusable for tissue work; it is never used.
      const usable = !!loadedMask && loadedMask.status !== 'rejected';
      const built = await worker.setGeometry({
        imageKey: next.id,
        tissue: usable ? loadedMask!.polygons : null,
        annotations: regional,
        // Plain copies: a reactive proxy cannot be posted to a worker.
        userNames: { ...annotationStore.userNames },
        typeNames,
        baseMpp: next.mpp,
      });
      if (!isCurrent()) return;

      mask.value = loadedMask;
      if (!slideSize.value && loadedMask) {
        slideSize.value = { width: loadedMask.level0Width, height: loadedMask.level0Height };
      }
      sets.value = built;
      geometryKey = next.id;
    } catch (e: any) {
      if (isCurrent())
        loadError.value = e?.message || 'Görüntünün maske ve annotation verisi yüklenemedi.';
    } finally {
      if (isCurrent()) loading.value = false;
    }
  }

  /** The viewer knows the level-0 size for certain once the DZI is open. */
  function setSlideSize(width: number, height: number) {
    if (slideSize.value?.width !== width || slideSize.value?.height !== height) {
      slideSize.value = { width, height };
    }
  }

  // ── computing ──────────────────────────────────────────────────────────────

  // Only what changes the candidates; thresholds and colours never reach the worker.
  const computeKey = computed(() =>
    blocker.value || loading.value || !slideSize.value || !image.value
      ? null
      : JSON.stringify([
          image.value.id,
          slideSize.value,
          settings.patchSize,
          settings.mpp,
          settings.overlap,
          settings.source,
          settings.placement,
          settings.placement === 'center' && settings.merge,
          settings.source === 'annotation' ? (labelSet.value?.key ?? null) : null,
        ])
  );

  let debounce: ReturnType<typeof setTimeout> | null = null;
  watch(computeKey, (key) => {
    if (debounce) clearTimeout(debounce);
    if (!key) {
      cells.value = null;
      crowded.value = null;
      return;
    }
    // Typing a patch size goes through 5, 51, 512: wait for the value to settle.
    debounce = setTimeout(recompute, 120);
  });

  async function recompute() {
    const current = image.value;
    const size = slideSize.value;
    if (!current || !size || !baseMpp.value || geometryKey !== current.id) return;
    computing.value = true;
    computeError.value = null;
    try {
      const result = await worker.compute({
        imageKey: current.id,
        width: size.width,
        height: size.height,
        patchSize: settings.patchSize,
        mpp: settings.mpp,
        baseMpp: baseMpp.value,
        overlap: settings.overlap,
        source: settings.source,
        placement: settings.placement,
        merge: settings.placement === 'center' && settings.merge,
        labelSetKey: labelSet.value?.key ?? null,
      });
      cells.value = result.cells;
      crowded.value = result.crowded;
      unresolved.value = result.unresolved;
      elapsedMs.value = result.elapsedMs;
    } catch (e: any) {
      if (e?.message === 'superseded') return;
      cells.value = null;
      computeError.value = e?.message || 'Izgara hesaplanamadı.';
    } finally {
      computing.value = false;
    }
  }

  // A colouring that the current mode does not have falls back to one it has.
  watch(
    () => [settings.source, settings.placement] as const,
    ([source, placement]) => {
      const available: ColorBy[] =
        source === 'tissue'
          ? placement === 'center'
            ? ['coverage', 'inside']
            : ['coverage']
          : [
              'label',
              'coverage',
              'purity',
              'tissueCoverage',
              ...(placement === 'center' ? (['inside'] as const) : []),
            ];
      if (!available.includes(settings.colorBy)) settings.colorBy = available[0]!;
    },
    { immediate: true }
  );

  watch(
    settings,
    (value) => {
      if (!settingsWorkspace) return;
      try {
        localStorage.setItem(STORAGE_PREFIX + settingsWorkspace, JSON.stringify(value));
      } catch {
        // Private mode or a full quota: the settings just do not survive a reload.
      }
    },
    { deep: true }
  );

  onUnmounted(() => {
    if (debounce) clearTimeout(debounce);
  });

  return {
    settings,
    image,
    mask,
    tissueUsable,
    sets,
    annotators,
    annotator,
    catalogLoading,
    chosenSet,
    provenance,
    imagesWithSet,
    neighbour,
    labelSet,
    pickAnnotator,
    pickType,
    polygonsSmallerThanPatch,
    slideSize,
    baseMpp,
    spec,
    specText,
    upsampled,
    loading,
    loadedAnnotations,
    computing,
    computeError,
    blocker,
    cells,
    kept,
    summary,
    crowded,
    unresolved,
    elapsedMs,
    snippet,
    load,
    setSlideSize,
    resetSettings: () =>
      Object.assign(settings, DEFAULT_SETTINGS, {
        // Thresholds and target go back to the defaults; whose labels stays as chosen.
        ownerId: settings.ownerId,
        annotationTypeId: settings.annotationTypeId,
      }),
  };
}

export type PatchGrid = ReturnType<typeof usePatchGrid>;
