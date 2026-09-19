// Patches centred on polygons — the port of `center_cells`, `center_annotations`,
// `_fit_groups` and `_group_boxes`. The off-grid sibling of the grid: where a
// patch is about as large as an object, a grid anchored at (0, 0) cuts the
// object arbitrarily, a centred patch does not.
import type { LabelPolygon } from './annotations';
import { allocate, emptyCells, type PatchCells } from './cells';
import {
  CoverageIndex,
  regionArea,
  regionBounds,
  type Bounds,
  type Poly,
  type Region,
} from './geometry';
import { measureLabels, type SlideSize } from './grid';
import { round4, roundHalfEven, type PatchSpec } from './spec';

/** Merged polygons per patch above which a centred patch labels a region, not an object. */
const CROWDED = 5;

/**
 * Groups boxes that fit one patch together → per box, the position of the first
 * box of its group.
 *
 * Pairs whose joint bounding box fits a `size0` square are taken tightest first,
 * and two groups are joined only while the box of the whole group still fits.
 * "Near" therefore needs no distance of its own — it follows from the patch —
 * and no chain of neighbours can outgrow the patch. A box larger than the patch
 * stays alone. Ties go by position, so the caller fixes the order of the boxes.
 */
export function fitGroups(bounds: Bounds[], size0: number): Int32Array {
  const n = bounds.length;
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const box = bounds.map((b) => ({ ...b }));
  const pool: number[] = [];
  for (let i = 0; i < n; i++) {
    if (box[i]!.maxX - box[i]!.minX <= size0 && box[i]!.maxY - box[i]!.minY <= size0) pool.push(i);
  }
  if (pool.length < 2) return parent;

  const find = (k: number): number => {
    while (parent[k] !== k) {
      parent[k] = parent[parent[k]!]!;
      k = parent[k]!;
    }
    return k;
  };

  // Candidate partners come from the neighbouring buckets of a size0 grid: two
  // boxes that share a patch are never further apart than that.
  const buckets = new Map<string, number[]>();
  const bucketOf = (v: number) => Math.floor(v / size0);
  for (const i of pool) {
    const key = `${bucketOf(box[i]!.minX)},${bucketOf(box[i]!.minY)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(i);
  }

  const pairs: { i: number; j: number; side: number }[] = [];
  for (const i of pool) {
    const bx = bucketOf(box[i]!.minX);
    const by = bucketOf(box[i]!.minY);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const j of buckets.get(`${bx + dx},${by + dy}`) ?? []) {
          if (j <= i) continue;
          const side = Math.max(
            Math.max(box[i]!.maxX, box[j]!.maxX) - Math.min(box[i]!.minX, box[j]!.minX),
            Math.max(box[i]!.maxY, box[j]!.maxY) - Math.min(box[i]!.minY, box[j]!.minY)
          );
          if (side <= size0) pairs.push({ i, j, side });
        }
      }
    }
  }
  pairs.sort((p, q) => p.side - q.side || p.i - q.i || p.j - q.j);

  for (const { i, j } of pairs) {
    let a = find(i);
    let c = find(j);
    if (a === c) continue;
    if (a > c) [a, c] = [c, a];
    const joint = {
      minX: Math.min(box[a]!.minX, box[c]!.minX),
      minY: Math.min(box[a]!.minY, box[c]!.minY),
      maxX: Math.max(box[a]!.maxX, box[c]!.maxX),
      maxY: Math.max(box[a]!.maxY, box[c]!.maxY),
    };
    if (joint.maxX - joint.minX <= size0 && joint.maxY - joint.minY <= size0) {
      parent[c] = a;
      box[a] = joint;
    }
  }
  return parent.map((_, k) => find(k));
}

interface Groups {
  /** For every member, the row of its group. */
  row: Int32Array;
  /** The first member of every group; groups come in the order of their first member. */
  first: number[];
  joint: Bounds[];
}

function groupBoxes(bounds: Bounds[], group: Int32Array): Groups {
  const first = [...new Set(group)].sort((a, b) => a - b);
  const rowOf = new Map(first.map((root, r) => [root, r]));
  const row = Int32Array.from(group, (root) => rowOf.get(root)!);
  const joint: Bounds[] = first.map(() => ({
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  }));
  bounds.forEach((b, k) => {
    const j = joint[row[k]!]!;
    j.minX = Math.min(j.minX, b.minX);
    j.minY = Math.min(j.minY, b.minY);
    j.maxX = Math.max(j.maxX, b.maxX);
    j.maxY = Math.max(j.maxY, b.maxY);
  });
  return { row, first, joint };
}

const clampStart = (centre: number, size0: number, limit: number) =>
  Math.min(Math.max(roundHalfEven(centre - size0 / 2), 0), limit - size0);

/**
 * One patch centred on every separate piece of `tissue` — each fragment of a
 * mask, each core of a TMA image.
 *
 * A piece that fits in the patch is centred by its bounding box; a larger one
 * gets the patch on its thickest part, so the patch is as full of tissue as one
 * patch can be. `coverage` is the share of the square inside the whole tissue,
 * `inside` the share of the piece that the patch contains. A patch is shifted
 * to stay on the slide. With `merge`, pieces that fit one patch together share
 * one, centred on their joint bounding box.
 *
 * Known difference from dev-ingestor: the thickest part is found with
 * polylabel, not GEOS' maximum inscribed circle. Both search to the same
 * tolerance (1/1000 of the piece), so such a patch may sit a few pixels apart
 * from dev-ingestor's; the number of patches is the same.
 */
export function centerCells(
  tissue: Region,
  spec: PatchSpec,
  slide: SlideSize,
  merge: boolean
): PatchCells {
  const size0 = spec.size0;
  if (!tissue.length || size0 > slide.width || size0 > slide.height) {
    return emptyCells('tissue', 'center', size0);
  }

  let pieces = tissue.map((poly) => ({ poly, bounds: regionBounds([poly])! }));
  if (merge) {
    // A fixed order, so that no tie depends on the order of the pieces.
    pieces = [...pieces].sort(
      (a, b) =>
        a.bounds.minX - b.bounds.minX ||
        a.bounds.minY - b.bounds.minY ||
        a.bounds.maxX - b.bounds.maxX ||
        a.bounds.maxY - b.bounds.maxY
    );
  }
  const bounds = pieces.map((p) => p.bounds);
  const { row, first, joint } = groupBoxes(
    bounds,
    merge ? fitGroups(bounds, size0) : Int32Array.from(bounds, (_, i) => i)
  );

  const whole = new CoverageIndex(tissue, size0);
  const x0 = new Int32Array(first.length);
  const y0 = new Int32Array(first.length);
  first.forEach((member, g) => {
    const b = joint[g]!;
    const fits = b.maxX - b.minX <= size0 && b.maxY - b.minY <= size0;
    // Larger than the patch: always a piece on its own.
    const [cx, cy] = fits
      ? [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2]
      : thickestPoint(pieces[member]!.poly);
    x0[g] = clampStart(cx, size0, slide.width);
    y0[g] = clampStart(cy, size0, slide.height);
  });

  const inside = new Float64Array(first.length).fill(Infinity);
  const members = new Int32Array(first.length);
  pieces.forEach((piece, k) => {
    const g = row[k]!;
    const share =
      new CoverageIndex([piece.poly], size0).area(x0[g]!, y0[g]!, size0) / regionArea([piece.poly]);
    inside[g] = Math.min(inside[g]!, share);
    members[g]!++;
  });

  const kept: number[] = [];
  const coverage: number[] = [];
  first.forEach((_, g) => {
    const value = round4(whole.coverage(x0[g]!, y0[g]!, size0));
    if (value > 0) {
      kept.push(g);
      coverage.push(value);
    }
  });

  const cells = allocate(kept.length, 'tissue', 'center', size0, []);
  kept.forEach((g, i) => {
    cells.x0[i] = x0[g]!;
    cells.y0[i] = y0[g]!;
    cells.coverage[i] = coverage[i]!;
    cells.inside[i] = round4(inside[g]!);
    cells.nPolygons[i] = members[g]!;
  });
  return cells;
}

export interface CenterAnnotationsResult {
  cells: PatchCells;
  /** Set when merged patches hold so many polygons that they label a region, not an object. */
  crowded: { polygons: number; patches: number } | null;
}

/**
 * One patch centred on every polygon of a label set — for objects smaller than
 * a patch (glands, nuclei clusters), which a grid cannot label.
 *
 * `inside` is the share of the polygon that the patch contains; a polygon bigger
 * than the patch scores low — that is grid territory. `label` is the polygon's
 * own; `coverage`, `purity` and the label shares are measured as on the grid.
 * With `merge`, polygons of one label that fit one patch together share one,
 * and `annotationIds` holds all of them joined by "|".
 *
 * `polygons` must be sorted by annotation id (as `labelSets` returns them).
 */
export function centerAnnotations(
  polygons: LabelPolygon[],
  labels: string[],
  regions: Region[],
  spec: PatchSpec,
  slide: SlideSize,
  tissue: Region | null,
  merge: boolean
): CenterAnnotationsResult {
  const size0 = spec.size0;
  if (size0 > slide.width || size0 > slide.height) {
    throw new Error(`${size0}px'lik bir patch ${slide.width}×${slide.height} slayta sığmıyor`);
  }
  if (!polygons.length)
    return { cells: emptyCells('annotation', 'center', size0, labels), crowded: null };

  const bounds = polygons.map((p) => p.bounds);
  const group = Int32Array.from(bounds, (_, i) => i);
  if (merge) {
    for (const label of labels) {
      const index = polygons.flatMap((p, i) => (p.label === label ? [i] : []));
      const local = fitGroups(
        index.map((i) => bounds[i]!),
        size0
      );
      index.forEach((i, k) => (group[i] = index[local[k]!]!));
    }
  }
  const { row, first, joint } = groupBoxes(bounds, group);

  const cells = allocate(first.length, 'annotation', 'center', size0, labels);
  const fixedLabel = new Int32Array(first.length);
  const ids: string[][] = first.map(() => []);
  first.forEach((member, g) => {
    const b = joint[g]!;
    cells.x0[g] = clampStart((b.minX + b.maxX) / 2, size0, slide.width);
    cells.y0[g] = clampStart((b.minY + b.maxY) / 2, size0, slide.height);
    fixedLabel[g] = labels.indexOf(polygons[member]!.label);
  });

  const inside = new Float64Array(first.length).fill(Infinity);
  polygons.forEach((polygon, k) => {
    const g = row[k]!;
    const share =
      new CoverageIndex(polygon.region, size0).area(cells.x0[g]!, cells.y0[g]!, size0) /
      polygon.area;
    inside[g] = Math.min(inside[g]!, share);
    cells.nPolygons[g]!++;
    ids[g]!.push(polygon.annotationId);
  });
  for (let g = 0; g < first.length; g++) cells.inside[g] = round4(inside[g]!);
  cells.annotationIds = ids.map((members) => members.join('|'));

  measureLabels(cells, regions, tissue, fixedLabel);
  const crowded =
    merge && polygons.length > CROWDED * first.length
      ? { polygons: polygons.length, patches: first.length }
      : null;
  return { cells, crowded };
}

// ── the thickest part of a polygon (polylabel) ───────────────────────────────

/** Signed distance from a point to the polygon outline: positive inside. */
function signedDistance(x: number, y: number, poly: Poly): number {
  let inside = false;
  let minSq = Infinity;
  for (const ring of poly) {
    for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
      const [ax, ay] = ring[i]!;
      const [bx, by] = ring[j]!;
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;

      let px = ax;
      let py = ay;
      const dx = bx - ax;
      const dy = by - ay;
      if (dx !== 0 || dy !== 0) {
        const t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
          px = bx;
          py = by;
        } else if (t > 0) {
          px += dx * t;
          py += dy * t;
        }
      }
      minSq = Math.min(minSq, (x - px) ** 2 + (y - py) ** 2);
    }
  }
  return (inside ? 1 : -1) * Math.sqrt(minSq);
}

/** Centre of the largest circle that fits in the polygon, to 1/1000 of its size. */
export function thickestPoint(poly: Poly): [number, number] {
  const b = regionBounds([poly])!;
  const width = b.maxX - b.minX;
  const height = b.maxY - b.minY;
  const cellSize = Math.min(width, height);
  if (cellSize === 0) return [b.minX, b.minY];
  const precision = Math.max(width, height) / 1000;

  interface Cell {
    x: number;
    y: number;
    h: number;
    d: number;
    max: number;
  }
  const cell = (x: number, y: number, h: number): Cell => {
    const d = signedDistance(x, y, poly);
    return { x, y, h, d, max: d + h * Math.SQRT2 };
  };

  // A binary heap on `max`: the most promising cell first.
  const heap: Cell[] = [];
  const push = (c: Cell) => {
    heap.push(c);
    for (let i = heap.length - 1; i > 0; ) {
      const parent = (i - 1) >> 1;
      if (heap[parent]!.max >= heap[i]!.max) break;
      [heap[parent], heap[i]] = [heap[i]!, heap[parent]!];
      i = parent;
    }
  };
  const pop = (): Cell => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l]!.max > heap[m]!.max) m = l;
        if (r < heap.length && heap[r]!.max > heap[m]!.max) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i]!, heap[m]!];
        i = m;
      }
    }
    return top;
  };

  let h = cellSize / 2;
  for (let x = b.minX; x < b.maxX; x += cellSize) {
    for (let y = b.minY; y < b.maxY; y += cellSize) push(cell(x + h, y + h, h));
  }
  let best = cell(b.minX + width / 2, b.minY + height / 2, 0);

  while (heap.length) {
    const c = pop();
    if (c.d > best.d) best = c;
    if (c.max - best.d <= precision) continue;
    h = c.h / 2;
    push(cell(c.x - h, c.y - h, h));
    push(cell(c.x + h, c.y - h, h));
    push(cell(c.x - h, c.y + h, h));
    push(cell(c.x + h, c.y + h, h));
  }
  return [best.x, best.y];
}
