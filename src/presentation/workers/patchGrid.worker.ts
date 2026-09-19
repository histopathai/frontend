// Computes patch candidates off the main thread. The geometry of an image is
// sent once; later requests only carry the patch target, so trying another
// patch size does not re-send or re-union thousands of polygons.
import {
  annotationPolygons,
  centerAnnotations,
  centerCells,
  gridAnnotations,
  gridCells,
  labelRegions,
  labelSets,
  newReport,
  patchSpec,
  tissueRegion,
  type AnnotationInput,
  type LabelPolygon,
  type LabelSet,
  type MaskPolygon,
  type PatchCells,
  type Placement,
  type PatchSource,
  type Region,
} from '@/core/patches';

export type PatchWorkerRequest =
  | {
      type: 'setGeometry';
      imageKey: string;
      /** null: the image has no usable tissue mask (none, or a rejected one). */
      tissue: MaskPolygon[] | null;
      /** Region annotations of the image, as they came from the server. */
      annotations: AnnotationInput[];
      userNames: Record<string, string>;
      typeNames: Record<string, string>;
      /** Level-0 µm per pixel, for the polygon sizes; null when the image has none. */
      baseMpp: number | null;
    }
  | {
      type: 'compute';
      requestId: number;
      imageKey: string;
      width: number;
      height: number;
      patchSize: number;
      mpp: number;
      baseMpp: number;
      overlap: number;
      source: PatchSource;
      placement: Placement;
      merge: boolean;
      labelSetKey: string | null;
    };

export interface PatchWorkerResult {
  cells: PatchCells;
  /** Merged patches hold so many polygons that they label a region, not an object. */
  crowded: { polygons: number; patches: number } | null;
  /**
   * Overlapping polygons the clipper could not resolve. Their overlap counts
   * twice, so coverage near them is approximate — the panel says so.
   */
  unresolved: number;
  elapsedMs: number;
}

export type PatchWorkerResponse =
  // Checking thousands of polygons for validity is work too: the label sets
  // are built here and handed back, so that loading an image never stalls the page.
  | { type: 'geometry'; imageKey: string; labelSets: LabelSet[] }
  | { type: 'result'; requestId: number; result: PatchWorkerResult }
  | { type: 'error'; requestId: number; message: string };

interface WorkerScope {
  onmessage: ((event: MessageEvent<PatchWorkerRequest>) => void) | null;
  postMessage(message: PatchWorkerResponse, transfer?: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

interface Geometry {
  key: string;
  tissue: Region | null;
  tissueUnresolved: number;
  labelSets: Record<string, LabelPolygon[]>;
  /** Label regions are built on first use: most label sets of an image are never looked at. */
  regions: Map<string, { labels: string[]; regions: Region[]; unresolved: number }>;
}
let geometry: Geometry | null = null;

// Requests that arrive while a grid is being computed are coalesced: only the
// newest one runs. Superseded requests get no answer (the caller already moved on).
let latest: Extract<PatchWorkerRequest, { type: 'compute' }> | null = null;
let scheduled = false;

scope.onmessage = (event) => {
  const msg = event.data;
  if (msg.type === 'setGeometry') {
    const report = newReport();
    const sets = labelSets(
      annotationPolygons(msg.annotations, msg.userNames, msg.typeNames, report),
      msg.baseMpp
    );
    const tissue = msg.tissue ? tissueRegion(msg.tissue, report) : null;
    geometry = {
      key: msg.imageKey,
      tissue,
      tissueUnresolved: report.unresolved,
      labelSets: Object.fromEntries(sets.map((set) => [set.key, set.polygons])),
      regions: new Map(),
    };
    scope.postMessage({ type: 'geometry', imageKey: msg.imageKey, labelSets: sets });
    warmUp(msg.imageKey, Object.keys(geometry.labelSets));
    return;
  }
  latest = msg;
  if (!scheduled) {
    scheduled = true;
    setTimeout(run, 0);
  }
};

/** The label regions of a set: built once per image, on first use or by the warm-up. */
function regionsOf(current: Geometry, key: string) {
  let built = current.regions.get(key);
  if (!built) {
    const report = newReport();
    built = { ...labelRegions(current.labelSets[key]!, report), unresolved: report.unresolved };
    current.regions.set(key, built);
  }
  return built;
}

/**
 * Builds the label regions of every annotator of the image ahead of time, one
 * set per turn of the event loop so that a compute request never waits behind
 * the whole lot. Switching the annotator while looking at an image then costs
 * the grid only, not the uniting of that annotator's polygons first.
 */
function warmUp(imageKey: string, keys: string[]) {
  const next = () => {
    const current = geometry;
    if (!current || current.key !== imageKey) return; // the user moved on
    const key = keys.find((k) => !current.regions.has(k));
    if (key === undefined) return;
    if (!latest) regionsOf(current, key); // a pending grid goes first
    setTimeout(next, 0);
  };
  setTimeout(next, 0);
}

function run() {
  scheduled = false;
  const req = latest;
  latest = null;
  if (!req) return;
  try {
    const result = compute(req);
    const c = result.cells;
    scope.postMessage({ type: 'result', requestId: req.requestId, result }, [
      c.col.buffer,
      c.row.buffer,
      c.x0.buffer,
      c.y0.buffer,
      c.coverage.buffer,
      c.purity.buffer,
      c.tissueCoverage.buffer,
      c.inside.buffer,
      c.nPolygons.buffer,
      c.label.buffer,
      c.labelShares.buffer,
    ]);
  } catch (e) {
    scope.postMessage({
      type: 'error',
      requestId: req.requestId,
      message: e instanceof Error ? e.message : String(e),
    });
  }
  if (latest && !scheduled) {
    scheduled = true;
    setTimeout(run, 0);
  }
}

function compute(req: Extract<PatchWorkerRequest, { type: 'compute' }>): PatchWorkerResult {
  const started = performance.now();
  if (!geometry || geometry.key !== req.imageKey) throw new Error('Görüntü geometrisi yüklenmedi');

  const spec = patchSpec(req.patchSize, req.mpp, req.baseMpp, req.overlap);
  const slide = { width: req.width, height: req.height };
  let cells: PatchCells;
  let crowded: PatchWorkerResult['crowded'] = null;
  let unresolved = geometry.tissueUnresolved;

  if (req.source === 'tissue') {
    if (!geometry.tissue) throw new Error('Bu görüntünün kullanılabilir doku maskesi yok');
    cells =
      req.placement === 'grid'
        ? gridCells(geometry.tissue, spec, slide)
        : centerCells(geometry.tissue, spec, slide, req.merge);
  } else {
    const polygons = req.labelSetKey ? geometry.labelSets[req.labelSetKey] : undefined;
    if (!polygons) throw new Error('Etiket kümesi seçilmedi');
    const built = regionsOf(geometry, req.labelSetKey!);
    unresolved += built.unresolved;
    if (req.placement === 'grid') {
      cells = gridAnnotations(built.labels, built.regions, spec, slide, geometry.tissue);
    } else {
      const result = centerAnnotations(
        polygons,
        built.labels,
        built.regions,
        spec,
        slide,
        geometry.tissue,
        req.merge
      );
      cells = result.cells;
      crowded = result.crowded;
    }
  }
  return { cells, crowded, unresolved, elapsedMs: performance.now() - started };
}
