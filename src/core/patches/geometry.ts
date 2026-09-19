// Polygon regions in level-0 pixels and the exact area of a region inside a
// square — the port of `_coverage`. Building regions (validity, union,
// difference) is in boolean.ts.
export type Pt = [number, number];
export type Ring = Pt[];
/** Exterior first, then holes. */
export type Poly = Ring[];
/** A MultiPolygon whose parts do not overlap — what polyclip returns. */
export type Region = Poly[];

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Shoelace area; the sign is the ring's orientation. */
export function ringSignedArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [ax, ay] = ring[i]!;
    const [bx, by] = ring[(i + 1) % n]!;
    sum += ax * by - bx * ay;
  }
  return sum / 2;
}

export function regionArea(region: Region): number {
  let area = 0;
  for (const poly of region) {
    poly.forEach((ring, i) => {
      area += (i === 0 ? 1 : -1) * Math.abs(ringSignedArea(ring));
    });
  }
  return area;
}

export function regionBounds(region: Region): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of region) {
    for (const [x, y] of poly[0] ?? []) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return minX <= maxX ? { minX, minY, maxX, maxY } : null;
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;
}

// ── exact coverage ───────────────────────────────────────────────────────────

/**
 * The edges of a region, bucketed into horizontal bands, ready to answer
 * "how much of this square is inside the region" for many squares.
 *
 * The area of region ∩ square is the integral of G dy around the region's
 * boundary (Green's theorem), where G(x, y) is how far x reaches into the
 * square, clamped to [0, side], and 0 outside the square's rows. That is exact —
 * this is geometry, not a raster — and an edge only matters to the squares
 * whose rows it crosses, which is what the bands are for.
 */
export class CoverageIndex {
  private readonly bandHeight: number;
  private readonly minY: number;
  private readonly bands: Int32Array[];
  // Per edge: xa, ya, xb, yb with ya < yb, then the weight (±1).
  private readonly edges: Float64Array;
  private readonly firstBand: Int32Array;
  private readonly minX: number;
  readonly empty: boolean;

  constructor(region: Region, bandHeight: number) {
    this.bandHeight = Math.max(1, bandHeight);
    const flat: number[] = [];
    let minY = Infinity;
    let maxY = -Infinity;
    let minX = Infinity;

    for (const poly of region) {
      poly.forEach((ring, ringIndex) => {
        // Exteriors add, holes subtract — whichever way the ring happens to run.
        const orientation = Math.sign(ringSignedArea(ring)) || 1;
        const weight = (ringIndex === 0 ? 1 : -1) * orientation;
        for (let i = 0, n = ring.length; i < n; i++) {
          const [ax, ay] = ring[i]!;
          const [bx, by] = ring[(i + 1) % n]!;
          if (ay === by) continue; // a horizontal edge has no dy
          if (ay < by) flat.push(ax, ay, bx, by, weight);
          else flat.push(bx, by, ax, ay, -weight);
          minY = Math.min(minY, ay, by);
          maxY = Math.max(maxY, ay, by);
          minX = Math.min(minX, ax, bx);
        }
      });
    }

    this.edges = Float64Array.from(flat);
    this.empty = flat.length === 0;
    this.minY = this.empty ? 0 : minY;
    this.minX = minX;
    const edgeCount = flat.length / 5;
    const bandCount = this.empty ? 0 : Math.floor((maxY - this.minY) / this.bandHeight) + 1;
    this.firstBand = new Int32Array(edgeCount);

    const counts = new Int32Array(bandCount);
    const lastBand = new Int32Array(edgeCount);
    for (let e = 0; e < edgeCount; e++) {
      const first = this.bandOf(this.edges[e * 5 + 1]!);
      const last = Math.min(bandCount - 1, this.bandOf(this.edges[e * 5 + 3]!));
      this.firstBand[e] = first;
      lastBand[e] = last;
      for (let b = first; b <= last; b++) counts[b]!++;
    }
    this.bands = Array.from(counts, (n) => new Int32Array(n));
    counts.fill(0);
    for (let e = 0; e < edgeCount; e++) {
      for (let b = this.firstBand[e]!; b <= lastBand[e]!; b++) this.bands[b]![counts[b]!++] = e;
    }
  }

  private bandOf(y: number): number {
    return Math.floor((y - this.minY) / this.bandHeight);
  }

  /** Area of the region inside the square with its corner at (x0, y0). */
  area(x0: number, y0: number, side: number): number {
    if (this.empty || x0 + side <= this.minX) return 0; // wholly left of the region
    const x1 = x0 + side;
    const y1 = y0 + side;
    const from = Math.max(0, this.bandOf(y0));
    const to = Math.min(this.bands.length - 1, this.bandOf(y1));
    const edges = this.edges;
    let sum = 0;

    for (let b = from; b <= to; b++) {
      const band = this.bands[b]!;
      for (let k = 0; k < band.length; k++) {
        const e = band[k]!;
        // An edge spanning several of this square's bands counts once, in the first.
        if (b !== Math.max(from, this.firstBand[e]!)) continue;

        const o = e * 5;
        const xa = edges[o]!;
        const ya = edges[o + 1]!;
        const xb = edges[o + 2]!;
        const yb = edges[o + 3]!;
        const lo = ya > y0 ? ya : y0;
        const hi = yb < y1 ? yb : y1;
        if (lo >= hi) continue;
        if (xa <= x0 && xb <= x0) continue; // left of the square: G is 0 there

        const height = hi - lo;
        const weight = edges[o + 4]!;
        if (xa >= x1 && xb >= x1) {
          sum += weight * side * height; // right of it: G is the full side
          continue;
        }
        const slope = (xb - xa) / (yb - ya);
        sum +=
          weight *
          clampedLinearIntegral(
            xa + (lo - ya) * slope - x0,
            xa + (hi - ya) * slope - x0,
            height,
            side
          );
      }
    }
    return sum;
  }

  /**
   * Fraction of the square inside the region. Float noise of the summation is
   * snapped at both ends, so a square that only touches the region is exactly 0
   * — what shapely reports, and what `coverage > 0` relies on.
   */
  coverage(x0: number, y0: number, side: number): number {
    const value = this.area(x0, y0, side) / (side * side);
    if (value < 1e-9) return 0;
    if (value > 1 - 1e-9) return 1;
    return value;
  }
}

/** ∫ clamp(u, 0, limit) over a segment of length `height` on which u runs linearly from u0 to u1. */
function clampedLinearIntegral(u0: number, u1: number, height: number, limit: number): number {
  if (u0 > u1) [u0, u1] = [u1, u0];
  if (u1 <= 0) return 0;
  if (u0 >= limit) return limit * height;
  if (u0 === u1) return u0 * height;

  const span = u1 - u0;
  const start = u0 < 0 ? -u0 / span : 0; // where u becomes positive
  const end = u1 > limit ? (limit - u0) / span : 1; // where u reaches the limit
  const a = u0 < 0 ? 0 : u0;
  const b = u1 > limit ? limit : u1;
  return height * (((end - start) * (a + b)) / 2 + (1 - end) * limit);
}
