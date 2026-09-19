// The numbers here come from dev-ingestor (scripts/export_patch_fixtures.py):
// what the browser shows must be what `pl.workspace_patches` produces.
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/patches.json';
import {
  centerAnnotations,
  centerCells,
  gridAnnotations,
  gridCells,
  labelCoverage,
  labelRegions,
  patchSpec,
  regionArea,
  regionBounds,
  tissueRegion,
  validRegion,
  type LabelPolygon,
  type PatchCells,
  type Region,
} from '..';

// Coverage is rounded to 4 decimals on both sides; a value on a rounding
// boundary may fall either way with the summation order.
const TOLERANCE = 1.5e-4;

type FixtureTissue = { exterior: number[][]; holes: number[][][] }[];
type FixtureAnnotation = { id: string; label: string; polygon: number[][] };

const toPoints = (ring: number[][]) => ring.map(([x, y]) => ({ x: x!, y: y! }));
const tissueOf = (tissue: FixtureTissue | null): Region | null =>
  tissue &&
  tissueRegion(
    tissue.map((p) => ({ exterior: toPoints(p.exterior), holes: p.holes.map(toPoints) }))
  );

function polygonsOf(annotations: FixtureAnnotation[]): LabelPolygon[] {
  return annotations
    .map((a) => {
      const region = validRegion(a.polygon.map(([x, y]) => [x!, y!]));
      return {
        annotationId: a.id,
        label: a.label,
        annotationTypeId: 't1',
        annotationType: 'Gleason',
        ownerId: 'o1',
        owner: 'imported',
        resource: 'imported',
        region,
        area: regionArea(region),
        bounds: regionBounds(region)!,
      };
    })
    .sort((a, b) => (a.annotationId < b.annotationId ? -1 : 1));
}

const specOf = (s: { patch_size: number; mpp: number; base_mpp: number; overlap: number }) =>
  patchSpec(s.patch_size, s.mpp, s.base_mpp, s.overlap);

function expectLabelColumns(cells: PatchCells, i: number, want: any, where: string) {
  expect(cells.labels[cells.label[i]!], where).toBe(want.label);
  expect(cells.coverage[i], `${where} coverage`).toBeCloseTo(want.coverage, 3);
  expect(Math.abs(cells.coverage[i]! - want.coverage), `${where} coverage`).toBeLessThanOrEqual(
    TOLERANCE
  );
  expect(Math.abs(cells.purity[i]! - want.purity), `${where} purity`).toBeLessThanOrEqual(
    TOLERANCE
  );
  if (want.tissue_coverage === null) expect(cells.tissueCoverage[i], `${where} tissue`).toBeNaN();
  else {
    expect(
      Math.abs(cells.tissueCoverage[i]! - want.tissue_coverage),
      `${where} tissue`
    ).toBeLessThanOrEqual(TOLERANCE);
  }
  // "G4:0.62|G3:0.31"
  const breakdown = Object.fromEntries(
    String(want.label_coverage)
      .split('|')
      .filter(Boolean)
      .map((part) => {
        const at = part.lastIndexOf(':');
        return [part.slice(0, at), Number(part.slice(at + 1))];
      })
  );
  const got = labelCoverage(cells, i);
  for (const { label, share } of got) {
    if (share >= 0.006) expect(breakdown[label], `${where} share of ${label}`).toBeDefined();
    if (breakdown[label] !== undefined) {
      expect(Math.abs(share - breakdown[label]), `${where} share of ${label}`).toBeLessThanOrEqual(
        0.0051
      );
    }
  }
}

describe('patchSpec', () => {
  it.each(fixture.specs)('$patch_size px @ $mpp on $base_mpp, overlap $overlap', (want) => {
    const spec = specOf(want);
    expect(spec.size0).toBe(want.size0);
    expect(spec.stride0).toBe(want.stride0);
  });
});

describe('gridCells', () => {
  it.each(fixture.tissue_grid)('$name', (scenario) => {
    const [width, height] = scenario.slide as [number, number];
    const cells = gridCells(tissueOf(scenario.tissue)!, specOf(scenario.spec), { width, height });

    expect(cells.count).toBe(scenario.cells.length);
    scenario.cells.forEach((want, i) => {
      const where = `cell ${i} (${want.x0}, ${want.y0})`;
      expect([cells.col[i], cells.row[i], cells.x0[i], cells.y0[i]], where).toEqual([
        want.col,
        want.row,
        want.x0,
        want.y0,
      ]);
      expect(Math.abs(cells.coverage[i]! - want.coverage), where).toBeLessThanOrEqual(TOLERANCE);
    });
  });
});

describe('gridAnnotations', () => {
  it.each(fixture.annotation_grid)('$name', (scenario) => {
    const [width, height] = scenario.slide as [number, number];
    const { labels, regions } = labelRegions(polygonsOf(scenario.annotations));
    const cells = gridAnnotations(
      labels,
      regions,
      specOf(scenario.spec),
      { width, height },
      tissueOf(scenario.tissue as FixtureTissue | null)
    );

    expect(cells.count).toBe(scenario.cells.length);
    scenario.cells.forEach((want, i) => {
      const where = `cell ${i} (${want.x0}, ${want.y0})`;
      expect([cells.col[i], cells.row[i], cells.x0[i], cells.y0[i]], where).toEqual([
        want.col,
        want.row,
        want.x0,
        want.y0,
      ]);
      expectLabelColumns(cells, i, want, where);
    });
  });
});

describe('centerCells', () => {
  it.each(fixture.tissue_center)('$name', (scenario) => {
    const [width, height] = scenario.slide as [number, number];
    const spec = specOf(scenario.spec);
    const cells = centerCells(tissueOf(scenario.tissue)!, spec, { width, height }, scenario.merge);
    expect(cells.count).toBe(scenario.cells.length);

    // GEOS and polyclip list the pieces of a union in their own order.
    const byPosition = (a: { x0: number; y0: number }, b: { x0: number; y0: number }) =>
      a.x0 - b.x0 || a.y0 - b.y0;
    const got = Array.from({ length: cells.count }, (_, i) => ({
      x0: cells.x0[i]!,
      y0: cells.y0[i]!,
      coverage: cells.coverage[i]!,
      inside: cells.inside[i]!,
      n: cells.nPolygons[i]!,
    })).sort(byPosition);
    const want = [...scenario.cells].sort(byPosition);

    want.forEach((w, i) => {
      const g = got[i]!;
      expect(g.n, `patch ${i}`).toBe(w.n_polygons);
      // A piece larger than the patch is placed by polylabel here and by GEOS'
      // maximum inscribed circle there: same tolerance, not the same pixel.
      const onThickestPart = w.inside < 0.999 && w.n_polygons === 1;
      const slack = onThickestPart ? 8 : 0;
      expect(Math.abs(g.x0 - w.x0), `patch ${i} x0`).toBeLessThanOrEqual(slack);
      expect(Math.abs(g.y0 - w.y0), `patch ${i} y0`).toBeLessThanOrEqual(slack);
      if (!onThickestPart) {
        expect(Math.abs(g.coverage - w.coverage), `patch ${i} coverage`).toBeLessThanOrEqual(
          TOLERANCE
        );
        expect(Math.abs(g.inside - w.inside), `patch ${i} inside`).toBeLessThanOrEqual(TOLERANCE);
      }
    });
  });
});

describe('centerAnnotations', () => {
  it.each(fixture.annotation_center)('$name', (scenario) => {
    const [width, height] = scenario.slide as [number, number];
    const polygons = polygonsOf(scenario.annotations);
    const { labels, regions } = labelRegions(polygons);
    const { cells, crowded } = centerAnnotations(
      polygons,
      labels,
      regions,
      specOf(scenario.spec),
      { width, height },
      tissueOf(scenario.tissue),
      scenario.merge
    );

    expect(cells.count).toBe(scenario.cells.length);
    expect(crowded !== null).toBe(scenario.crowded);
    scenario.cells.forEach((want, i) => {
      const where = `patch ${i} (${want.annotation_id})`;
      expect(cells.annotationIds[i], where).toBe(want.annotation_id);
      expect([cells.x0[i], cells.y0[i], cells.nPolygons[i]], where).toEqual([
        want.x0,
        want.y0,
        want.n_polygons,
      ]);
      expect(Math.abs(cells.inside[i]! - want.inside), `${where} inside`).toBeLessThanOrEqual(
        TOLERANCE
      );
      expectLabelColumns(cells, i, want, where);
    });
  });
});
