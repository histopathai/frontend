// Patches on the slide grid — the port of `grid_cells` and `grid_annotations`.
import { allocate, emptyCells, latticeAxis, type PatchCells } from './cells';
import { CoverageIndex, regionBounds, type Region } from './geometry';
import { round4, type PatchSpec } from './spec';

export interface SlideSize {
  width: number;
  height: number;
}

/**
 * Every grid square that has any area inside `tissue`, with its coverage
 * = area(tissue ∩ square) / area(square). Coverage is geometry, not pixels: gaps
 * that the mask does not carve out still count. A grid step that would stick
 * out of the slide is snapped flush to the slide edge instead of dropped (see
 * `latticeAxis`). Row-major, like dev-ingestor's table.
 */
export function gridCells(tissue: Region, spec: PatchSpec, slide: SlideSize): PatchCells {
  const bounds = regionBounds(tissue);
  if (!bounds) return emptyCells('tissue', 'grid', spec.size0);

  const cols = latticeAxis(bounds.minX, bounds.maxX, slide.width, spec);
  const rows = latticeAxis(bounds.minY, bounds.maxY, slide.height, spec);
  const index = new CoverageIndex(tissue, spec.size0);

  const picked: number[] = [];
  const coverage: number[] = [];
  for (let r = 0; r < rows.index.length; r++) {
    for (let c = 0; c < cols.index.length; c++) {
      const value = round4(index.coverage(cols.start[c]!, rows.start[r]!, spec.size0));
      if (value > 0) {
        picked.push(r * cols.index.length + c);
        coverage.push(value);
      }
    }
  }

  const cells = allocate(picked.length, 'tissue', 'grid', spec.size0, []);
  picked.forEach((flat, i) => {
    const c = flat % cols.index.length;
    const r = (flat - c) / cols.index.length;
    cells.col[i] = cols.index[c]!;
    cells.row[i] = rows.index[r]!;
    cells.x0[i] = cols.start[c]!;
    cells.y0[i] = rows.start[r]!;
    cells.coverage[i] = coverage[i]!;
  });
  return cells;
}

/**
 * Fills `label`, `coverage`, `purity`, `labelShares` and `tissueCoverage` of
 * squares whose corners are already set — the port of `_label_columns` and the
 * measuring half of `_finish`.
 *
 * Coverage is measured per label: all polygons of a label count together, so a
 * square lying across two neighbouring "G4" polygons is judged on their sum.
 * With `fixedLabel` the square keeps that label (centred patches carry their
 * polygon's); otherwise it gets the label that covers most of it.
 */
export function measureLabels(
  cells: PatchCells,
  regions: Region[],
  tissue: Region | null,
  fixedLabel?: Int32Array,
  indexes: CoverageIndex[] = regions.map((region) => new CoverageIndex(region, cells.size0))
): void {
  const side = cells.size0;
  const n = cells.labels.length;
  const tissueIndex = tissue ? new CoverageIndex(tissue, side) : null;

  for (let i = 0; i < cells.count; i++) {
    let annotated = 0;
    let best = 0;
    for (let l = 0; l < n; l++) {
      const share = indexes[l]!.coverage(cells.x0[i]!, cells.y0[i]!, side);
      cells.labelShares[i * n + l] = share;
      annotated += share;
      if (share > cells.labelShares[i * n + best]!) best = l; // a tie goes to the first label by name
    }
    const label = fixedLabel ? fixedLabel[i]! : best;
    const own = cells.labelShares[i * n + label]!;
    cells.label[i] = label;
    cells.coverage[i] = round4(own);
    cells.purity[i] = round4(annotated > 0 ? own / annotated : 0);
    if (tissueIndex) {
      cells.tissueCoverage[i] = round4(tissueIndex.coverage(cells.x0[i]!, cells.y0[i]!, side));
    }
  }
}

/**
 * Labelled grid candidates for one label set: every grid square that touches
 * any annotated area. `labels` / `regions` come from `labelRegions`.
 *
 * dev-ingestor picks the candidates from the union of all labels. The label
 * regions do not overlap, so "some share is above 0" is the same test — without
 * uniting thousands of polygons once more, which is where a clipper gives up.
 *
 * Polygons smaller than a patch can never reach a useful coverage here; those
 * are what centred patches are for.
 */
export function gridAnnotations(
  labels: string[],
  regions: Region[],
  spec: PatchSpec,
  slide: SlideSize,
  tissue: Region | null
): PatchCells {
  const bounds = regionBounds(regions.flat());
  if (!bounds) return emptyCells('annotation', 'grid', spec.size0, labels);

  const cols = latticeAxis(bounds.minX, bounds.maxX, slide.width, spec);
  const rows = latticeAxis(bounds.minY, bounds.maxY, slide.height, spec);
  const indexes = regions.map((region) => new CoverageIndex(region, spec.size0));

  const picked: number[] = [];
  for (let r = 0; r < rows.index.length; r++) {
    for (let c = 0; c < cols.index.length; c++) {
      if (indexes.some((index) => index.coverage(cols.start[c]!, rows.start[r]!, spec.size0) > 0)) {
        picked.push(r * cols.index.length + c);
      }
    }
  }

  const cells = allocate(picked.length, 'annotation', 'grid', spec.size0, labels);
  picked.forEach((flat, i) => {
    const c = flat % cols.index.length;
    const r = (flat - c) / cols.index.length;
    cells.col[i] = cols.index[c]!;
    cells.row[i] = rows.index[r]!;
    cells.x0[i] = cols.start[c]!;
    cells.y0[i] = rows.start[r]!;
  });
  measureLabels(cells, regions, tissue, undefined, indexes);
  return cells;
}
