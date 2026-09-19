// Patch candidates and their thresholds.
//
// dev-ingestor computes the metrics and applies `min_coverage`, `min_purity`, …
// in one call. Here they are two steps: the worker returns every candidate with
// its metrics once, and moving a threshold slider only re-filters — no recompute.
import { roundHalfEven, type PatchSpec } from './spec';

export type PatchSource = 'tissue' | 'annotation';
export type Placement = 'grid' | 'center';

/** Candidates as columns; every array has `count` entries. NaN means "not applicable". */
export interface PatchCells {
  count: number;
  size0: number;
  source: PatchSource;
  placement: Placement;
  /** Grid position; -1 for centred patches, which are not on the grid. */
  col: Int32Array;
  row: Int32Array;
  /** Top-left corner, level-0 pixels. */
  x0: Int32Array;
  y0: Int32Array;
  /** Share of the square inside the tissue (source "tissue") or carrying the patch's label. */
  coverage: Float64Array;
  /** Share of the square's annotated area carrying its label; below 1 the patch is a mixed zone. */
  purity: Float64Array;
  /** Share of the square inside the tissue mask; NaN when the image has no usable mask. */
  tissueCoverage: Float64Array;
  /** Centred patches: share of the polygon(s) that the patch contains. */
  inside: Float64Array;
  /** Centred patches: how many polygons or tissue pieces share the patch. */
  nPolygons: Int32Array;
  /** Index into `labels`; -1 for tissue patches. */
  label: Int32Array;
  labels: string[];
  /** Share of every label in every square, row-major: `labelShares[i * labels.length + l]`. */
  labelShares: Float64Array;
  /** Centred annotation patches: the annotation id, or several joined by "|" when merged. */
  annotationIds: string[];
}

export interface Thresholds {
  minCoverage: number;
  minPurity: number;
  minTissue: number;
  minInside: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  minCoverage: 0.5,
  minPurity: 0,
  minTissue: 0.5,
  minInside: 0.9,
};

/**
 * Indices of the candidates that pass — the same rules as `grid_cells`,
 * `center_cells`, `grid_annotations`, `center_annotations` and `_finish`.
 */
export function filterCells(cells: PatchCells, t: Thresholds): Uint32Array {
  const kept: number[] = [];
  const annotation = cells.source === 'annotation';
  const centred = cells.placement === 'center';
  for (let i = 0; i < cells.count; i++) {
    if (annotation) {
      if (centred ? cells.inside[i]! < t.minInside : cells.coverage[i]! < t.minCoverage) continue;
      if (cells.purity[i]! < t.minPurity) continue;
      // Without a usable mask the patches are kept unfiltered (tissue_coverage stays empty).
      const tissue = cells.tissueCoverage[i]!;
      if (!Number.isNaN(tissue) && tissue < t.minTissue) continue;
    } else if (cells.coverage[i]! < t.minCoverage || !(cells.coverage[i]! > 0)) {
      continue;
    }
    kept.push(i);
  }
  return Uint32Array.from(kept);
}

/** `G4:0.62|G3:0.31` — the label breakdown of one patch, as dev-ingestor writes it. */
export function labelCoverage(cells: PatchCells, i: number): { label: string; share: number }[] {
  const n = cells.labels.length;
  const out: { label: string; share: number }[] = [];
  for (let l = 0; l < n; l++) {
    const share = cells.labelShares[i * n + l]!;
    if (share >= 0.005) out.push({ label: cells.labels[l]!, share });
  }
  return out.sort((a, b) => b.share - a.share);
}

export function emptyCells(
  source: PatchSource,
  placement: Placement,
  size0: number,
  labels: string[] = []
): PatchCells {
  return allocate(0, source, placement, size0, labels);
}

export function allocate(
  count: number,
  source: PatchSource,
  placement: Placement,
  size0: number,
  labels: string[]
): PatchCells {
  const nan = () => new Float64Array(count).fill(NaN);
  return {
    count,
    size0,
    source,
    placement,
    col: new Int32Array(count).fill(-1),
    row: new Int32Array(count).fill(-1),
    x0: new Int32Array(count),
    y0: new Int32Array(count),
    coverage: new Float64Array(count),
    purity: nan(),
    tissueCoverage: nan(),
    inside: nan(),
    nPolygons: new Int32Array(count),
    label: new Int32Array(count).fill(-1),
    labels,
    labelShares: new Float64Array(count * labels.length),
    annotationIds: [],
  };
}

// ── the grid ─────────────────────────────────────────────────────────────────

export interface Axis {
  index: Int32Array;
  start: Int32Array;
}

/**
 * Grid positions along one axis whose square touches [lo, hi] and lies fully on
 * the slide. The grid is anchored at the slide's (0, 0) and each start is
 * rounded on its own, so it never drifts.
 */
export function latticeAxis(lo: number, hi: number, limit: number, spec: PatchSpec): Axis {
  const { size0, stride0 } = spec;
  const index: number[] = [];
  const start: number[] = [];
  const last = Math.ceil(hi / stride0);
  for (let i = Math.floor((lo - size0) / stride0) + 1; i < last; i++) {
    const s = roundHalfEven(i * stride0);
    if (s >= 0 && s + size0 <= limit) {
      index.push(i);
      start.push(s);
    }
  }
  return { index: Int32Array.from(index), start: Int32Array.from(start) };
}
