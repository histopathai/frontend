import { describe, expect, it } from 'vitest';
import {
  allocate,
  DEFAULT_THRESHOLDS,
  filterCells,
  labelCoverage,
  patchSummary,
  pythonSnippet,
  thickestPoint,
} from '..';

function labelled() {
  // Two labels; columns: coverage, purity, tissue, inside
  const cells = allocate(4, 'annotation', 'grid', 200, ['G3', 'G4']);
  const rows = [
    [0.9, 1.0, 1.0, NaN, 0],
    [0.6, 0.7, 0.4, NaN, 1],
    [0.3, 1.0, 1.0, NaN, 1],
    [0.8, 0.5, NaN, NaN, 0],
  ];
  rows.forEach(([coverage, purity, tissue, inside, label], i) => {
    cells.coverage[i] = coverage!;
    cells.purity[i] = purity!;
    cells.tissueCoverage[i] = tissue!;
    cells.inside[i] = inside!;
    cells.label[i] = label!;
  });
  cells.labelShares.set([0.9, 0, 0.26, 0.6, 0.001, 0.3, 0.8, 0.8]);
  return cells;
}

describe('filterCells', () => {
  it('applies coverage, purity and tissue to labelled grid patches', () => {
    const cells = labelled();
    expect([...filterCells(cells, { ...DEFAULT_THRESHOLDS, minTissue: 0 })]).toEqual([0, 1, 3]);
    expect([...filterCells(cells, DEFAULT_THRESHOLDS)]).toEqual([0, 3]); // 1: tissue 0.4 < 0.5
    expect([...filterCells(cells, { ...DEFAULT_THRESHOLDS, minPurity: 0.9 })]).toEqual([0]);
  });

  it('keeps a labelled patch unfiltered when the image has no usable tissue mask', () => {
    expect([...filterCells(labelled(), { ...DEFAULT_THRESHOLDS, minTissue: 1 })]).toEqual([0, 3]);
  });

  it('judges centred labelled patches on inside, not coverage', () => {
    const cells = labelled();
    cells.placement = 'center';
    cells.inside.set([1, 0.95, 0.5, 0.2]);
    cells.coverage.fill(0.01);
    expect([...filterCells(cells, { ...DEFAULT_THRESHOLDS, minTissue: 0 })]).toEqual([0, 1]);
  });

  it('never keeps a tissue patch without coverage, even at min_coverage 0', () => {
    const cells = allocate(3, 'tissue', 'grid', 200, []);
    cells.coverage.set([0, 0.2, 0.7]);
    expect([...filterCells(cells, { ...DEFAULT_THRESHOLDS, minCoverage: 0 })]).toEqual([1, 2]);
    expect([...filterCells(cells, DEFAULT_THRESHOLDS)]).toEqual([2]);
  });
});

describe('labelCoverage', () => {
  it('lists the labels of a patch, largest first, dropping shares under half a percent', () => {
    const cells = labelled();
    expect(labelCoverage(cells, 1)).toEqual([
      { label: 'G4', share: 0.6 },
      { label: 'G3', share: 0.26 },
    ]);
    expect(labelCoverage(cells, 2)).toEqual([{ label: 'G4', share: 0.3 }]);
  });
});

describe('patchSummary', () => {
  it('gives one row per label with the share of mixed patches', () => {
    const cells = labelled();
    const rows = patchSummary(cells, Uint32Array.from([0, 1, 2, 3]));
    expect(rows.map((r) => [r.label, r.patches, r.mixed])).toEqual([
      ['G3', 2, 0.5],
      ['G4', 2, 0.5],
    ]);
    expect(rows[0]!.coverage).toBeCloseTo(0.85);
    expect(rows[1]!.purity).toBeCloseTo(0.85);
  });

  it('gives a single tissue row for unlabelled patches', () => {
    const cells = allocate(2, 'tissue', 'grid', 200, []);
    cells.coverage.set([0.5, 1]);
    const rows = patchSummary(cells, Uint32Array.from([0, 1]));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ label: 'tissue', patches: 2, coverage: 0.75 });
    expect(rows[0]!.purity).toBeNaN();
  });
});

describe('pythonSnippet', () => {
  const base = { ...DEFAULT_THRESHOLDS, patchSize: 512, mpp: 0.5, overlap: 0, merge: false };

  it('writes only what a tissue grid reads', () => {
    const text = pythonSnippet({ ...base, source: 'tissue', placement: 'grid' }, null);
    expect(text).toContain(
      'patch_size=512,\n    mpp=0.5,\n    overlap=0.0,\n    source="tissue",\n    placement="grid",\n    min_coverage=0.5,\n)'
    );
    expect(text).not.toMatch(/owner|min_purity|min_tissue|min_inside|merge/);
    expect(text).toContain('table, report = pl.workspace_patches(ds, **params)');
  });

  it('names the label set and the centred thresholds', () => {
    const text = pythonSnippet(
      { ...base, source: 'annotation', placement: 'center', merge: true, mpp: 1 },
      { owner: 'Ayşe "A" Yılmaz', annotationType: 'Gleason Skorlama' }
    );
    expect(text).toContain('mpp=1.0,');
    expect(text).toContain('owner="Ayşe \\"A\\" Yılmaz",');
    expect(text).toContain('annotation_type="Gleason Skorlama",');
    expect(text).toContain(
      'merge=True,\n    min_inside=0.9,\n    min_purity=0.0,\n    min_tissue=0.5,'
    );
    expect(text).not.toContain('min_coverage');
  });
});

describe('thickestPoint', () => {
  it('finds the wide end of an L-shaped polygon, not the middle of its bounding box', () => {
    // A 1000 × 1000 block with a thin 3000 × 100 arm.
    const poly = [
      [
        [0, 0],
        [1000, 0],
        [1000, 450],
        [4000, 450],
        [4000, 550],
        [1000, 550],
        [1000, 1000],
        [0, 1000],
      ] as [number, number][],
    ];
    const [x, y] = thickestPoint(poly);
    expect(Math.abs(x - 500)).toBeLessThan(10);
    expect(Math.abs(y - 500)).toBeLessThan(10);
  });
});
