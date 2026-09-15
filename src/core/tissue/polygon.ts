import type { Mask } from './mask';

export interface TissuePoint {
  x: number;
  y: number;
}

/** One 4-connected tissue component; rings are implicitly closed. */
export interface TissuePolygon {
  exterior: TissuePoint[];
  holes: TissuePoint[][];
}

export function pointCount(polygons: TissuePolygon[]): number {
  let n = 0;
  for (const p of polygons) {
    n += p.exterior.length;
    for (const h of p.holes) n += h.length;
  }
  return n;
}

// Directions in screen coordinates (y down); turning right is d + 1.
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

interface Ring {
  xs: number[];
  ys: number[];
  label: number;
  outer: boolean;
}

/**
 * Traces the mask boundary along pixel edges, simplifies each ring with
 * Douglas-Peucker and scales vertices. Same output order as the Go port.
 */
export function extractPolygons(
  m: Mask,
  tolerance: number,
  scaleX: number,
  scaleY: number
): TissuePolygon[] {
  const labels = labelComponents(m);
  const rings = traceRings(m, labels);
  const byLabel = new Map<number, number>();
  const polygons: TissuePolygon[] = [];
  for (const r of rings) {
    if (!r.outer) continue;
    byLabel.set(r.label, polygons.length);
    polygons.push({ exterior: scaleRing(simplifyRing(r, tolerance), scaleX, scaleY), holes: [] });
  }
  for (const r of rings) {
    if (r.outer) continue;
    polygons[byLabel.get(r.label)!]!.holes.push(
      scaleRing(simplifyRing(r, tolerance), scaleX, scaleY)
    );
  }
  return polygons;
}

export function labelComponents(m: Mask): Int32Array {
  const { width: w, height: h, pix } = m;
  const labels = new Int32Array(pix.length);
  const stack: number[] = [];
  let next = 0;
  for (let start = 0; start < pix.length; start++) {
    if (!pix[start] || labels[start]) continue;
    next++;
    labels[start] = next;
    stack.push(start);
    while (stack.length > 0) {
      const i = stack.pop()!;
      const x = i % w;
      const y = (i - x) / w;
      if (x > 0 && pix[i - 1] && !labels[i - 1]) {
        labels[i - 1] = next;
        stack.push(i - 1);
      }
      if (x < w - 1 && pix[i + 1] && !labels[i + 1]) {
        labels[i + 1] = next;
        stack.push(i + 1);
      }
      if (y > 0 && pix[i - w] && !labels[i - w]) {
        labels[i - w] = next;
        stack.push(i - w);
      }
      if (y < h - 1 && pix[i + w] && !labels[i + w]) {
        labels[i + w] = next;
        stack.push(i + w);
      }
    }
  }
  return labels;
}

function traceRings(m: Mask, labels: Int32Array): Ring[] {
  const { width: w, height: h, pix } = m;
  const vw = w + 1;
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && pix[y * w + x] === 1;

  const edges = new Uint8Array(vw * (h + 1));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!pix[y * w + x]) continue;
      if (!at(x, y - 1)) edges[y * vw + x]! |= 1 << 0;
      if (!at(x + 1, y)) edges[y * vw + x + 1]! |= 1 << 1;
      if (!at(x, y + 1)) edges[(y + 1) * vw + x + 1]! |= 1 << 2;
      if (!at(x - 1, y)) edges[(y + 1) * vw + x]! |= 1 << 3;
    }
  }

  const visited = new Uint8Array(edges.length);
  const rings: Ring[] = [];
  for (let v = 0; v < edges.length; v++) {
    if (!edges[v]) continue;
    for (let d = 0; d < 4; d++) {
      if (!(edges[v]! & (1 << d)) || visited[v]! & (1 << d)) continue;
      const vx = v % vw;
      const vy = (v - vx) / vw;
      const xs: number[] = [];
      const ys: number[] = [];
      const label = labels[rightPixel(vx, vy, d, w)]!;
      let cur = v;
      let dir = d;
      let area2 = 0;
      for (;;) {
        visited[cur]! |= 1 << dir;
        const cx = cur % vw;
        const cy = (cur - cx) / vw;
        const nx = cx + DX[dir]!;
        const ny = cy + DY[dir]!;
        area2 += cx * ny - nx * cy;
        const next = ny * vw + nx;
        let nd = dir;
        for (const t of [1, 0, 3]) {
          const c = (dir + t) % 4;
          if (edges[next]! & (1 << c)) {
            nd = c;
            break;
          }
        }
        if (nd !== dir) {
          xs.push(nx);
          ys.push(ny);
        }
        if (next === v && nd === d) break;
        cur = next;
        dir = nd;
      }
      // The start vertex is always a corner and was appended last.
      xs.unshift(xs.pop()!);
      ys.unshift(ys.pop()!);
      rings.push({ xs, ys, label, outer: area2 > 0 });
    }
  }
  return rings;
}

function rightPixel(vx: number, vy: number, d: number, w: number): number {
  switch (d) {
    case 1:
      return vy * w + vx - 1;
    case 2:
      return (vy - 1) * w + vx - 1;
    case 3:
      return (vy - 1) * w + vx;
    default:
      return vy * w + vx;
  }
}

/**
 * Douglas-Peucker on a closed ring split at its first vertex and the vertex
 * farthest from it, comparing cross² > tolerance² · length² exactly.
 */
function simplifyRing(r: Ring, tolerance: number): TissuePoint[] {
  const { xs, ys } = r;
  const n = xs.length;
  const all = () => xs.map((x, i) => ({ x, y: ys[i]! }));
  if (tolerance <= 0 || n < 4) return all();

  let far = 0;
  let best = -1;
  for (let i = 1; i < n; i++) {
    const dx = xs[0]! - xs[i]!;
    const dy = ys[0]! - ys[i]!;
    const d = dx * dx + dy * dy;
    if (d > best) {
      far = i;
      best = d;
    }
  }
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[far] = 1;
  const tol2 = tolerance * tolerance;
  const stack: number[] = [0, far, far, n];
  while (stack.length > 0) {
    const j = stack.pop()!;
    const i = stack.pop()!;
    if (j - i < 2) continue;
    const ax = xs[i]!;
    const ay = ys[i]!;
    const bx = xs[j % n]!;
    const by = ys[j % n]!;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let k = -1;
    let kd = -1;
    for (let q = i + 1; q < j; q++) {
      let d: number;
      if (len2 === 0) {
        const ex = xs[q]! - ax;
        const ey = ys[q]! - ay;
        d = ex * ex + ey * ey;
      } else {
        d = dx * (ys[q]! - ay) - dy * (xs[q]! - ax);
        d *= d;
      }
      if (d > kd) {
        k = q;
        kd = d;
      }
    }
    const limit = len2 === 0 ? tol2 : tol2 * len2;
    if (kd > limit) {
      keep[k] = 1;
      stack.push(i, k, k, j);
    }
  }
  const out: TissuePoint[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push({ x: xs[i]!, y: ys[i]! });
  return out.length < 3 ? all() : out;
}

function scaleRing(pts: TissuePoint[], sx: number, sy: number): TissuePoint[] {
  return pts.map((p) => ({ x: p.x * sx, y: p.y * sy }));
}
