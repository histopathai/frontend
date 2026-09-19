// Building regions: validity, union and difference — the port of `_valid`,
// `tissue_polygon` and what `_label_regions` asks of shapely.
//
// A general polygon clipper is slow on a 50 000-vertex tissue outline and can
// fail outright on thousands of polygons at once. Almost none of the polygons
// here need one: fragments of a mask are apart, a gland lies apart from the
// next gland, a small region lies wholly inside a large one. Those cases are
// decided exactly by two plain tests — do the outlines touch anywhere, and is a
// vertex of one inside the other — and only polygons whose outlines really
// touch go to the clipper, a few at a time, with a fallback if it gives up.
import { difference, union } from 'polyclip-ts';
import {
  boundsIntersect,
  regionBounds,
  ringSignedArea,
  type Bounds,
  type Poly,
  type Region,
  type Ring,
} from './geometry';

/** Set when the clipper failed somewhere and an approximation was used instead. */
export interface BuildReport {
  /** Overlapping polygons that could not be resolved; their overlap counts twice. */
  unresolved: number;
}

export const newReport = (): BuildReport => ({ unresolved: 0 });

// ── outlines ─────────────────────────────────────────────────────────────────

const orient = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
  (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

const onSegment = (ax: number, ay: number, bx: number, by: number, px: number, py: number) =>
  Math.min(ax, bx) <= px &&
  px <= Math.max(ax, bx) &&
  Math.min(ay, by) <= py &&
  py <= Math.max(ay, by);

/** Whether two segments share any point — crossing, touching or overlapping. */
function segmentsTouch(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): boolean {
  const o1 = orient(ax, ay, bx, by, cx, cy);
  const o2 = orient(ax, ay, bx, by, dx, dy);
  const o3 = orient(cx, cy, dx, dy, ax, ay);
  const o4 = orient(cx, cy, dx, dy, bx, by);
  if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0)))
    return true;
  return (
    (o1 === 0 && onSegment(ax, ay, bx, by, cx, cy)) ||
    (o2 === 0 && onSegment(ax, ay, bx, by, dx, dy)) ||
    (o3 === 0 && onSegment(cx, cy, dx, dy, ax, ay)) ||
    (o4 === 0 && onSegment(cx, cy, dx, dy, bx, by))
  );
}

/**
 * The segments of a polygon in a uniform grid, so that "does anything touch
 * this segment" looks at a handful of neighbours instead of every segment.
 */
class Outline {
  readonly bounds: Bounds;
  /** Per segment: ax, ay, bx, by, then the ring it belongs to and its position there. */
  private readonly seg: Float64Array;
  private readonly ringOf: Int32Array;
  private readonly posOf: Int32Array;
  private readonly ringLength: number[];
  private readonly cell: number;
  private readonly cols: number;
  private readonly rows: number;
  private readonly buckets: Map<number, number[]> = new Map();

  constructor(readonly poly: Poly) {
    this.bounds = regionBounds([poly])!;
    const flat: number[] = [];
    const ringOf: number[] = [];
    const posOf: number[] = [];
    this.ringLength = poly.map((ring) => ring.length);
    poly.forEach((ring, r) => {
      for (let i = 0, n = ring.length; i < n; i++) {
        const [ax, ay] = ring[i]!;
        const [bx, by] = ring[(i + 1) % n]!;
        flat.push(ax, ay, bx, by);
        ringOf.push(r);
        posOf.push(i);
      }
    });
    this.seg = Float64Array.from(flat);
    this.ringOf = Int32Array.from(ringOf);
    this.posOf = Int32Array.from(posOf);

    const count = ringOf.length;
    const width = this.bounds.maxX - this.bounds.minX;
    const height = this.bounds.maxY - this.bounds.minY;
    // About one segment per cell along the outline.
    this.cell = Math.max(Math.max(width, height) / Math.max(1, Math.sqrt(count) * 2), 1e-9);
    this.cols = Math.floor(width / this.cell) + 1;
    this.rows = Math.floor(height / this.cell) + 1;
    for (let s = 0; s < count; s++) {
      this.eachCell(flat[s * 4]!, flat[s * 4 + 1]!, flat[s * 4 + 2]!, flat[s * 4 + 3]!, (key) => {
        const bucket = this.buckets.get(key);
        if (bucket) bucket.push(s);
        else this.buckets.set(key, [s]);
      });
    }
  }

  private eachCell(ax: number, ay: number, bx: number, by: number, visit: (key: number) => void) {
    const c0 = Math.max(0, Math.floor((Math.min(ax, bx) - this.bounds.minX) / this.cell));
    const c1 = Math.min(
      this.cols - 1,
      Math.floor((Math.max(ax, bx) - this.bounds.minX) / this.cell)
    );
    const r0 = Math.max(0, Math.floor((Math.min(ay, by) - this.bounds.minY) / this.cell));
    const r1 = Math.min(
      this.rows - 1,
      Math.floor((Math.max(ay, by) - this.bounds.minY) / this.cell)
    );
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) visit(r * this.cols + c);
  }

  /** Whether the segment touches this outline; `skip` exempts segments by index. */
  private touched(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    skip?: (s: number) => boolean
  ): boolean {
    const b = this.bounds;
    if (
      Math.max(ax, bx) < b.minX ||
      Math.min(ax, bx) > b.maxX ||
      Math.max(ay, by) < b.minY ||
      Math.min(ay, by) > b.maxY
    ) {
      return false;
    }
    let hit = false;
    this.eachCell(ax, ay, bx, by, (key) => {
      if (hit) return;
      for (const s of this.buckets.get(key) ?? []) {
        if (skip?.(s)) continue;
        const o = s * 4;
        if (
          segmentsTouch(
            ax,
            ay,
            bx,
            by,
            this.seg[o]!,
            this.seg[o + 1]!,
            this.seg[o + 2]!,
            this.seg[o + 3]!
          )
        ) {
          hit = true;
          return;
        }
      }
    });
    return hit;
  }

  /** Whether any segment of `other` shares a point with any segment of this outline. */
  touches(other: Outline): boolean {
    if (!boundsIntersect(this.bounds, other.bounds)) return false;
    // Walk the shorter outline and look its segments up in the longer one's grid.
    if (other.seg.length > this.seg.length) return other.touches(this);
    const seg = other.seg;
    for (let o = 0; o < seg.length; o += 4) {
      if (this.touched(seg[o]!, seg[o + 1]!, seg[o + 2]!, seg[o + 3]!)) return true;
    }
    return false;
  }

  /** No segment touches another — of its own ring or of another ring of the polygon —
   *  other than neighbours at their shared vertex. */
  isSimple(): boolean {
    for (let s = 0, n = this.ringOf.length; s < n; s++) {
      const o = s * 4;
      const ring = this.ringOf[s]!;
      const pos = this.posOf[s]!;
      const length = this.ringLength[ring]!;
      const neighbour = (t: number) =>
        t === s ||
        (this.ringOf[t] === ring &&
          (this.posOf[t] === (pos + 1) % length || this.posOf[t] === (pos + length - 1) % length));
      if (
        this.touched(this.seg[o]!, this.seg[o + 1]!, this.seg[o + 2]!, this.seg[o + 3]!, neighbour)
      )
        return false;
    }
    return true;
  }
}

const outlines = new WeakMap<Poly, Outline>();
function outlineOf(poly: Poly): Outline {
  let outline = outlines.get(poly);
  if (!outline) {
    outline = new Outline(poly);
    outlines.set(poly, outline);
  }
  return outline;
}

function inRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
    const [ax, ay] = ring[i]!;
    const [bx, by] = ring[j]!;
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

/** Inside the exterior and in none of the holes. */
function inFill(x: number, y: number, poly: Poly): boolean {
  if (!inRing(x, y, poly[0]!)) return false;
  for (let h = 1; h < poly.length; h++) if (inRing(x, y, poly[h]!)) return false;
  return true;
}

type Relation = 'apart' | 'aInsideB' | 'bInsideA' | 'entangled';

/**
 * How two polygons lie, decided without clipping when their outlines do not
 * touch: then each outline is wholly on one side of the other, and one vertex
 * tells which.
 *
 *   aInsideB   a lies in b's filled area and covers none of b's holes: a ∪ b = b
 *   entangled  the outlines touch, or one covers a hole of the other — clip
 */
function relate(a: Poly, b: Poly): Relation {
  const oa = outlineOf(a);
  const ob = outlineOf(b);
  if (!boundsIntersect(oa.bounds, ob.bounds)) return 'apart';
  if (oa.touches(ob)) return 'entangled';

  const coversHoleOf = (outer: Poly, inner: Poly) =>
    outer.slice(1).some((hole) => inRing(hole[0]![0], hole[0]![1], inner[0]!));
  const [ax, ay] = a[0]![0]!;
  const [bx, by] = b[0]![0]!;
  if (inFill(ax, ay, b)) return coversHoleOf(b, a) ? 'entangled' : 'aInsideB';
  if (inFill(bx, by, a)) return coversHoleOf(a, b) ? 'entangled' : 'bInsideA';
  // Neither vertex is in the other's fill, yet one may sit in a hole of the
  // other and cover nothing of it, or surround it entirely.
  if (inRing(ax, ay, b[0]!) || inRing(bx, by, a[0]!)) {
    return coversHoleOf(a, b) || coversHoleOf(b, a) ? 'entangled' : 'apart';
  }
  return 'apart';
}

// ── validity ─────────────────────────────────────────────────────────────────

function cleanRing(ring: Ring): Ring {
  const out: Ring = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  // A closed ring repeats its first point; rings here are implicitly closed.
  while (
    out.length > 1 &&
    out[0]![0] === out[out.length - 1]![0] &&
    out[0]![1] === out[out.length - 1]![1]
  )
    out.pop();
  return out;
}

/**
 * One polygon as a valid region. A ring that crosses itself (a bow-tie from a
 * sloppy click sequence) is split into its lobes, as shapely's `make_valid`
 * does; a simple polygon — nearly all of them — is taken as it is.
 */
export function validRegion(exterior: Ring, holes: Ring[] = [], report?: BuildReport): Region {
  const rings = [cleanRing(exterior), ...holes.map(cleanRing).filter((h) => h.length >= 3)];
  if (rings[0]!.length < 3) return [];
  const poly: Poly = rings;
  // The signed area says nothing about a ring that crosses itself: the two
  // lobes of a bow-tie cancel to exactly 0.
  if (outlineOf(poly).isSimple()) return ringSignedArea(rings[0]!) === 0 ? [] : [poly];
  try {
    return union([poly]) as Region;
  } catch {
    if (report) report.unresolved++;
    return [poly];
  }
}

// ── union ────────────────────────────────────────────────────────────────────

/** Pairs of indices whose bounding boxes intersect, by a sweep over minX. */
function* boxPairs(bounds: Bounds[]): Generator<[number, number]> {
  const order = bounds.map((_, i) => i).sort((a, b) => bounds[a]!.minX - bounds[b]!.minX);
  for (let s = 0; s < order.length; s++) {
    const i = order[s]!;
    for (let t = s + 1; t < order.length && bounds[order[t]!]!.minX <= bounds[i]!.maxX; t++) {
      if (boundsIntersect(bounds[i]!, bounds[order[t]!]!)) yield [i, order[t]!];
    }
  }
}

/**
 * Union of regions, as parts that do not overlap. Polygons that lie apart are
 * kept, a polygon inside another is dropped, and only polygons whose outlines
 * touch are clipped — together, as one small job.
 */
export function unionRegions(regions: Region[], report?: BuildReport): Region {
  const polys = regions.flat();
  const bounds = polys.map((poly) => outlineOf(poly).bounds);
  const dropped = new Uint8Array(polys.length);
  const parent = polys.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };

  for (const [i, j] of boxPairs(bounds)) {
    switch (relate(polys[i]!, polys[j]!)) {
      case 'aInsideB':
        dropped[i] = 1;
        break;
      case 'bInsideA':
        dropped[j] = 1;
        break;
      case 'entangled':
        parent[find(j)] = find(i);
        break;
    }
  }

  const clusters = new Map<number, Poly[]>();
  polys.forEach((poly, i) => {
    if (dropped[i]) return;
    const root = find(i);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(poly);
  });

  const out: Region = [];
  for (const cluster of clusters.values()) {
    if (cluster.length === 1) {
      out.push(cluster[0]!);
      continue;
    }
    try {
      out.push(...(union([cluster[0]!], ...cluster.slice(1).map((poly) => [poly])) as Region));
    } catch {
      // Kept side by side: where they overlap the area counts twice (coverage is capped at 1).
      if (report) report.unresolved += cluster.length;
      out.push(...cluster);
    }
  }
  return out;
}

// ── difference ───────────────────────────────────────────────────────────────

/**
 * `region` without the `cutters`. A cutter that lies wholly inside a polygon
 * becomes a hole of it — the usual case, a small region drawn inside a large
 * one; only cutters whose outline touches the polygon's are clipped.
 *
 * The cutters are united first. Cutters may overlap each other, and two
 * overlapping holes would take their shared area away twice; united, every
 * piece is either a clean hole, apart, or a job for the clipper — and the
 * polygon's outline is indexed once, not once per hole added.
 */
export function subtractRegions(region: Region, cutters: Region[], report?: BuildReport): Region {
  if (!cutters.length) return region;
  const pieces = unionRegions(cutters, report);

  const out: Region = [];
  for (const poly of region) {
    const holes: Ring[] = [];
    const islands: Region = [];
    const clip: Poly[] = [];
    let gone = false;
    for (const piece of pieces) {
      const relation = relate(piece, poly);
      if (relation === 'apart') continue;
      if (relation === 'bInsideA') {
        gone = true; // the polygon lies inside the piece: nothing of it is left
        break;
      }
      if (relation === 'aInsideB') {
        holes.push(piece[0]!);
        // What a ring-shaped piece encloses is not cut away: it stays, as an island.
        for (const hole of piece.slice(1)) islands.push([hole]);
      } else clip.push(piece);
    }
    if (gone) continue;

    // Clip first, on the polygon as it came: the pieces do not overlap each
    // other, so a hole-to-be is untouched by the clipping — and the clipper
    // never sees a polygon carrying hundreds of holes.
    let parts: Region = [poly];
    if (clip.length) {
      try {
        parts = difference([poly], ...clip.map((piece) => [piece])) as Region;
      } catch {
        if (report) report.unresolved += clip.length;
      }
    }
    // A clipped polygon may have come apart: every hole goes to the part it lies in.
    const rest: Region = parts.map((part) => [...part]);
    for (const hole of holes) {
      const [x, y] = hole[0]!;
      const home = rest.length === 1 ? rest[0] : rest.find((part) => inRing(x, y, part[0]!));
      home?.push(hole);
    }
    rest.push(...islands);
    out.push(...rest);
  }
  return out;
}

// ── tissue ───────────────────────────────────────────────────────────────────

export interface MaskPolygon {
  exterior: { x: number; y: number }[];
  holes: { x: number; y: number }[][];
}

const toRing = (points: { x: number; y: number }[]): Ring => points.map((p) => [p.x, p.y]);

/**
 * A tissue mask as one region. Holes are cut out; a tissue island inside a hole
 * is its own entry in the mask and comes back through the union.
 */
export function tissueRegion(polygons: MaskPolygon[], report?: BuildReport): Region {
  return unionRegions(
    polygons.map((p) => validRegion(toRing(p.exterior), p.holes.map(toRing), report)),
    report
  );
}
