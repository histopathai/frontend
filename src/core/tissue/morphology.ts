import type { Mask } from './mask';

/** skimage.morphology.closing(mask, disk(radius)) with "reflect" boundaries. */
export function closing(m: Mask, radius: number): void {
  if (radius <= 0) return;
  m.pix = dilate(m.pix, m.width, m.height, radius, 1);
  m.pix = dilate(m.pix, m.width, m.height, radius, 0);
}

function diskHalfWidths(r: number): Int32Array {
  const hw = new Int32Array(2 * r + 1);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = r; dx >= 0; dx--) {
      if (dx * dx + dy * dy <= r * r) {
        hw[dy + r] = dx;
        break;
      }
    }
  }
  return hw;
}

/** Grows pixels equal to value by a disk; dilating 0 is erosion. */
export function dilate(pix: Uint8Array, w: number, h: number, r: number, value: 0 | 1): Uint8Array {
  return w <= r || h <= r ? dilateReflect(pix, w, h, r, value) : dilateClipped(pix, w, h, r, value);
}

export function dilateReflect(
  pix: Uint8Array,
  w: number,
  h: number,
  r: number,
  value: 0 | 1
): Uint8Array {
  const hw = diskHalfWidths(r);
  const out = new Uint8Array(pix.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let hit = false;
      for (let dy = -r; dy <= r && !hit; dy++) {
        const row = reflect(y + dy, h) * w;
        const k = hw[dy + r]!;
        for (let dx = -k; dx <= k; dx++) {
          if (pix[row + reflect(x + dx, w)] === value) {
            hit = true;
            break;
          }
        }
      }
      out[y * w + x] = hit === (value === 1) ? 1 : 0;
    }
  }
  return out;
}

export function dilateClipped(
  pix: Uint8Array,
  w: number,
  h: number,
  r: number,
  value: 0 | 1
): Uint8Array {
  const hw = diskHalfWidths(r);
  const out = new Uint8Array(pix.length);
  const dist = new Uint8Array(pix.length);
  const capped = r + 1;
  for (let y = 0; y < h; y++) {
    const base = y * w;
    let last = capped;
    for (let x = 0; x < w; x++) {
      if (pix[base + x] === value) last = 0;
      else if (last < capped) last++;
      dist[base + x] = last;
    }
    last = capped;
    for (let x = w - 1; x >= 0; x--) {
      if (pix[base + x] === value) last = 0;
      else if (last < capped) last++;
      if (last < dist[base + x]!) dist[base + x] = last;
    }
  }
  const inside = value === 1 ? 1 : 0;
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(y - r, 0);
    const y1 = Math.min(y + r, h - 1);
    for (let x = 0; x < w; x++) {
      let hit = false;
      for (let yy = y0; yy <= y1; yy++) {
        if (dist[yy * w + x]! <= hw[yy - y + r]!) {
          hit = true;
          break;
        }
      }
      out[y * w + x] = hit ? inside : 1 - inside;
    }
  }
  return out;
}

/** scipy.ndimage "reflect" mode: d c b a | a b c d | d c b a */
export function reflect(i: number, n: number): number {
  i %= 2 * n;
  if (i < 0) i += 2 * n;
  if (i >= n) i = 2 * n - 1 - i;
  return i;
}

/**
 * Flips 4-connected components of pixels equal to value whose area is <= maxArea
 * (value 1: remove_small_objects, value 0: remove_small_holes).
 */
export function removeSmallComponents(m: Mask, value: 0 | 1, maxArea: number): void {
  if (maxArea <= 0) return;
  const { width: w, height: h, pix } = m;
  const seen = new Uint8Array(pix.length);
  const stack: number[] = [];
  const component: number[] = [];
  for (let start = 0; start < pix.length; start++) {
    if (pix[start] !== value || seen[start]) continue;
    seen[start] = 1;
    stack.length = 0;
    stack.push(start);
    component.length = 0;
    let area = 0;
    while (stack.length > 0) {
      const i = stack.pop()!;
      area++;
      if (area <= maxArea) component.push(i);
      const x = i % w;
      if (x > 0 && pix[i - 1] === value && !seen[i - 1]) {
        seen[i - 1] = 1;
        stack.push(i - 1);
      }
      if (x < w - 1 && pix[i + 1] === value && !seen[i + 1]) {
        seen[i + 1] = 1;
        stack.push(i + 1);
      }
      if (i >= w && pix[i - w] === value && !seen[i - w]) {
        seen[i - w] = 1;
        stack.push(i - w);
      }
      if (i < (h - 1) * w && pix[i + w] === value && !seen[i + w]) {
        seen[i + w] = 1;
        stack.push(i + w);
      }
    }
    if (area <= maxArea) {
      const flipped = value === 1 ? 0 : 1;
      for (const i of component) pix[i] = flipped;
    }
  }
}
