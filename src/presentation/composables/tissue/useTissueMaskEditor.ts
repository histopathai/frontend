import { computed, ref, shallowRef } from 'vue';
import { useToast } from 'vue-toastification';
import { repositories } from '@/services';
import type { Image } from '@/core/entities/Image';
import type { TissueMask } from '@/core/entities/TissueMask';
import {
  ALGORITHM_VERSION,
  MAX_POINTS,
  areaRatio,
  clampPoint,
  defaultTissueParams,
  hitTest,
  insertVertex,
  moveVertex,
  orientExterior,
  pointCount,
  removePolygon,
  removeVertex,
  validateTissueParams,
  type RingIndex,
  type TissueParams,
  type TissuePoint,
  type TissuePolygon,
} from '@/core/tissue';
import { decodePreview, useTissueWorker } from './useTissueWorker';

export type TissueTool = 'select' | 'delete' | 'draw';

interface Geometry {
  previewWidth: number;
  previewHeight: number;
  level0Width: number;
  level0Height: number;
  downsampleX: number;
  downsampleY: number;
}

interface Snapshot {
  polygons: TissuePolygon[];
  params: TissueParams;
  geometry: Geometry | null;
  ratio: number;
  manuallyEdited: boolean;
}

const HISTORY_LIMIT = 50;
const COMPUTE_DEBOUNCE_MS = 120;

export function useTissueMaskEditor() {
  const toast = useToast();
  const worker = useTissueWorker();

  const image = shallowRef<Image | null>(null);
  const mask = shallowRef<TissueMask | null>(null);
  const loading = ref(false);
  const computing = ref(false);
  // A parameter change is waiting for the debounce timer.
  const computeScheduled = ref(false);
  const saving = ref(false);
  const previewState = ref<'none' | 'loading' | 'ready' | 'missing'>('none');

  const params = ref<TissueParams>(defaultTissueParams());
  const polygons = shallowRef<TissuePolygon[]>([]);
  const geometry = shallowRef<Geometry | null>(null);
  const ratio = ref(0);
  const lastComputeMs = ref<number | null>(null);

  // manuallyEdited: polygons differ from what the current params produce.
  // dirty: the state differs from the stored mask.
  const manuallyEdited = ref(false);
  const dirty = ref(false);

  const tool = ref<TissueTool>('select');
  const selectedIndex = ref(-1);
  const draft = ref<TissuePoint[]>([]);
  const history = shallowRef<Snapshot[]>([]);

  // Parameter change waiting for confirmation because it would drop manual edits.
  const pendingParams = ref<TissueParams | null>(null);

  const level0Size = shallowRef<{ width: number; height: number } | null>(null);
  let loadToken = 0;
  let computeSeq = 0;
  let computeTimer: ReturnType<typeof setTimeout> | null = null;
  let computeWhenSized = false;

  // While a recomputation is pending, manual edits are refused: the result
  // would replace the polygons and silently drop the edit.
  const busy = computed(() => computing.value || computeScheduled.value);

  const status = computed(() => mask.value?.status ?? null);
  const polygonCount = computed(() => polygons.value.length);
  const totalPoints = computed(() => pointCount(polygons.value));
  const overPointLimit = computed(() => totalPoints.value > MAX_POINTS);
  const canUndo = computed(() => history.value.length > 0);
  const canSave = computed(
    () =>
      !!image.value &&
      !!geometry.value &&
      dirty.value &&
      !computing.value &&
      !saving.value &&
      !overPointLimit.value
  );
  const canApprove = computed(
    () => !!mask.value && !dirty.value && !saving.value && mask.value.status !== 'approved'
  );

  function level0(): { width: number; height: number } | null {
    if (mask.value) return { width: mask.value.level0Width, height: mask.value.level0Height };
    return level0Size.value;
  }

  function resetState() {
    if (computeTimer) clearTimeout(computeTimer);
    computeTimer = null;
    computeScheduled.value = false;
    computeSeq++;
    computing.value = false;
    mask.value = null;
    params.value = defaultTissueParams();
    polygons.value = [];
    geometry.value = null;
    ratio.value = 0;
    lastComputeMs.value = null;
    manuallyEdited.value = false;
    dirty.value = false;
    selectedIndex.value = -1;
    draft.value = [];
    history.value = [];
    pendingParams.value = null;
    level0Size.value = null;
    computeWhenSized = false;
  }

  function applyMask(m: TissueMask) {
    mask.value = m;
    params.value = { ...m.params };
    polygons.value = m.polygons;
    geometry.value = {
      previewWidth: m.previewWidth,
      previewHeight: m.previewHeight,
      level0Width: m.level0Width,
      level0Height: m.level0Height,
      downsampleX: m.downsampleX,
      downsampleY: m.downsampleY,
    };
    ratio.value = m.tissueAreaRatio;
    manuallyEdited.value = false;
    dirty.value = false;
    selectedIndex.value = -1;
    history.value = [];
  }

  async function load(img: Image | null) {
    const token = ++loadToken;
    resetState();
    image.value = img;
    previewState.value = 'none';
    if (!img) return;

    loading.value = true;
    previewState.value = 'loading';
    try {
      const [stored, blob] = await Promise.all([
        repositories.tissueMask.getByImage(img.id),
        repositories.tissueMask.getPreview(img.id),
      ]);
      if (token !== loadToken) return;
      if (stored) applyMask(stored);

      if (!blob) {
        previewState.value = 'missing';
        return;
      }
      const pixels = await decodePreview(blob);
      if (token !== loadToken) return;
      worker.setImage(img.id, pixels);
      previewState.value = 'ready';

      // Without a stored mask, show the default computation as an unsaved draft.
      if (!stored) await computeNow();
    } catch (e: any) {
      if (token === loadToken) toast.error(e?.message || 'Doku maskı yüklenemedi');
    } finally {
      if (token === loadToken) loading.value = false;
    }
  }

  /** Called when the viewer knows the DZI size; used when no mask is stored. */
  function setLevel0Size(width: number, height: number) {
    level0Size.value = { width, height };
    if (computeWhenSized) {
      computeWhenSized = false;
      computeNow();
    }
  }

  function snapshot(): Snapshot {
    return {
      polygons: polygons.value,
      params: { ...params.value },
      geometry: geometry.value,
      ratio: ratio.value,
      manuallyEdited: manuallyEdited.value,
    };
  }

  function pushHistory() {
    history.value = [...history.value.slice(-(HISTORY_LIMIT - 1)), snapshot()];
  }

  function undo() {
    const previous = history.value[history.value.length - 1];
    if (!previous) return;
    // Undo wins over a pending recomputation of the parameters being undone.
    if (computeTimer) clearTimeout(computeTimer);
    computeTimer = null;
    computeScheduled.value = false;
    computeSeq++;
    computing.value = false;
    history.value = history.value.slice(0, -1);
    polygons.value = previous.polygons;
    params.value = previous.params;
    geometry.value = previous.geometry;
    ratio.value = previous.ratio;
    manuallyEdited.value = previous.manuallyEdited;
    selectedIndex.value = -1;
    dirty.value = true;
  }

  async function computeNow(): Promise<void> {
    if (computeTimer) {
      clearTimeout(computeTimer);
      computeTimer = null;
    }
    computeScheduled.value = false;
    const img = image.value;
    if (!img || previewState.value !== 'ready') return;
    const size = level0();
    if (!size) {
      computeWhenSized = true;
      return;
    }

    const seq = ++computeSeq;
    computing.value = true;
    const requested = { ...params.value };
    try {
      const result = await worker.compute(img.id, requested, size.width, size.height);
      if (seq !== computeSeq || image.value?.id !== img.id) return;

      pushHistory();
      polygons.value = result.polygons;
      geometry.value = {
        previewWidth: result.previewWidth,
        previewHeight: result.previewHeight,
        level0Width: size.width,
        level0Height: size.height,
        downsampleX: result.downsampleX,
        downsampleY: result.downsampleY,
      };
      ratio.value = result.tissueAreaRatio;
      lastComputeMs.value = result.elapsedMs;
      manuallyEdited.value = false;
      dirty.value = true;
      selectedIndex.value = -1;
      if (result.params.simplify_tolerance !== requested.simplify_tolerance) {
        params.value = { ...params.value, simplify_tolerance: result.params.simplify_tolerance };
        toast.info(
          `Nokta sınırı (${MAX_POINTS}) için sadeleştirme toleransı ${result.params.simplify_tolerance} yapıldı`
        );
      }
    } catch (e: any) {
      if (e?.message !== 'superseded' && seq === computeSeq) {
        toast.error(`Maske hesaplanamadı: ${e?.message || e}`);
      }
    } finally {
      if (seq === computeSeq) computing.value = false;
    }
  }

  function scheduleCompute() {
    if (computeTimer) clearTimeout(computeTimer);
    computeScheduled.value = true;
    computeTimer = setTimeout(() => {
      computeTimer = null;
      computeNow();
    }, COMPUTE_DEBOUNCE_MS);
  }

  /** Applies parameter changes; asks for confirmation first if manual edits would be lost. */
  function requestParams(next: Partial<TissueParams>) {
    const merged = { ...params.value, ...next };
    if (validateTissueParams(merged)) return;
    if (manuallyEdited.value) {
      pendingParams.value = merged;
      return;
    }
    params.value = merged;
    scheduleCompute();
  }

  function confirmPendingParams() {
    if (!pendingParams.value) return;
    params.value = pendingParams.value;
    pendingParams.value = null;
    manuallyEdited.value = false;
    computeNow();
  }

  function cancelPendingParams() {
    pendingParams.value = null;
  }

  function resetToDefaults() {
    requestParams(defaultTissueParams());
  }

  // --- Manual editing -------------------------------------------------------

  function afterManualEdit() {
    manuallyEdited.value = true;
    dirty.value = true;
    const g = geometry.value;
    if (g) ratio.value = areaRatio(polygons.value, g.level0Width, g.level0Height);
  }

  function clamp(point: TissuePoint): TissuePoint {
    const g = geometry.value;
    return g ? clampPoint(point, g.level0Width, g.level0Height) : point;
  }

  function refuseWhileBusy(): boolean {
    if (busy.value) {
      toast.info('Maske yeniden hesaplanıyor; bitince tekrar deneyin', { timeout: 1500 });
      return true;
    }
    return false;
  }

  function selectAt(point: TissuePoint) {
    selectedIndex.value = hitTest(polygons.value, point);
  }

  function deleteAt(point: TissuePoint) {
    if (refuseWhileBusy()) return;
    const index = hitTest(polygons.value, point);
    if (index < 0) return;
    pushHistory();
    polygons.value = removePolygon(polygons.value, index);
    selectedIndex.value = -1;
    afterManualEdit();
  }

  function deleteSelected() {
    if (selectedIndex.value < 0 || refuseWhileBusy()) return;
    pushHistory();
    polygons.value = removePolygon(polygons.value, selectedIndex.value);
    selectedIndex.value = -1;
    afterManualEdit();
  }

  function addDraftPoint(point: TissuePoint) {
    if (refuseWhileBusy()) return;
    draft.value = [...draft.value, clamp(point)];
  }

  function finishDraft() {
    const points = draft.value;
    draft.value = [];
    if (points.length < 3 || !geometry.value || refuseWhileBusy()) return;
    pushHistory();
    polygons.value = [...polygons.value, { exterior: orientExterior(points), holes: [] }];
    selectedIndex.value = polygons.value.length - 1;
    afterManualEdit();
  }

  function cancelDraft() {
    draft.value = [];
  }

  /** Starts a vertex drag; the whole drag is one undo step. Returns false while busy. */
  function beginVertexDrag(): boolean {
    if (refuseWhileBusy()) return false;
    pushHistory();
    return true;
  }

  function dragVertex(ring: RingIndex, vertex: number, point: TissuePoint) {
    if (selectedIndex.value < 0) return;
    polygons.value = moveVertex(polygons.value, selectedIndex.value, ring, vertex, clamp(point));
    afterManualEdit();
  }

  /** Inserts a vertex without recording history (used when a drag starts on an edge midpoint). */
  function insertVertexForDrag(ring: RingIndex, after: number, point: TissuePoint) {
    if (selectedIndex.value < 0) return;
    polygons.value = insertVertex(polygons.value, selectedIndex.value, ring, after, clamp(point));
    afterManualEdit();
  }

  function deleteVertex(ring: RingIndex, vertex: number) {
    if (selectedIndex.value < 0 || refuseWhileBusy()) return;
    const next = removeVertex(polygons.value, selectedIndex.value, ring, vertex);
    if (next === polygons.value) return;
    pushHistory();
    polygons.value = next;
    afterManualEdit();
  }

  // --- Persistence ----------------------------------------------------------

  async function save() {
    if (computeTimer) await computeNow();
    const img = image.value;
    const g = geometry.value;
    if (!img || !g || !canSave.value) return;

    saving.value = true;
    try {
      const saved = await repositories.tissueMask.save(img.id, {
        algorithm_version: ALGORITHM_VERSION,
        params: { ...params.value },
        polygons: polygons.value,
        preview_width: g.previewWidth,
        preview_height: g.previewHeight,
        level0_width: g.level0Width,
        level0_height: g.level0Height,
        downsample_x: g.downsampleX,
        downsample_y: g.downsampleY,
        tissue_area_ratio: ratio.value,
      });
      if (image.value?.id !== img.id) return;
      applyMask(saved);
      toast.success('Doku maskı kaydedildi');
    } catch (e: any) {
      toast.error(e?.message || 'Doku maskı kaydedilemedi');
    } finally {
      saving.value = false;
    }
  }

  async function approve() {
    const img = image.value;
    if (!img || !canApprove.value) return;
    saving.value = true;
    try {
      const approved = await repositories.tissueMask.approve(img.id);
      if (image.value?.id !== img.id) return;
      mask.value = approved;
      toast.success('Doku maskı onaylandı');
    } catch (e: any) {
      toast.error(e?.message || 'Doku maskı onaylanamadı');
    } finally {
      saving.value = false;
    }
  }

  return {
    // state
    image,
    mask,
    loading,
    computing,
    busy,
    saving,
    previewState,
    params,
    polygons,
    geometry,
    ratio,
    lastComputeMs,
    manuallyEdited,
    dirty,
    tool,
    selectedIndex,
    draft,
    pendingParams,
    // derived
    status,
    polygonCount,
    totalPoints,
    overPointLimit,
    canUndo,
    canSave,
    canApprove,
    // actions
    load,
    setLevel0Size,
    requestParams,
    confirmPendingParams,
    cancelPendingParams,
    resetToDefaults,
    undo,
    selectAt,
    deleteAt,
    deleteSelected,
    addDraftPoint,
    finishDraft,
    cancelDraft,
    beginVertexDrag,
    dragVertex,
    insertVertexForDrag,
    deleteVertex,
    save,
    approve,
  };
}

export type TissueMaskEditor = ReturnType<typeof useTissueMaskEditor>;
