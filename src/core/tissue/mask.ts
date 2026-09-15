import { closing, removeSmallComponents } from './morphology';
import { otsuThreshold } from './otsu';
import { OTSU_SATURATION_MAX_VALUE, validateTissueParams, type TissueParams } from './params';

/** Binary tissue mask in preview pixels, row-major, 1 = tissue. */
export interface Mask {
  width: number;
  height: number;
  pix: Uint8Array;
}

/** Interleaved RGBA pixels, e.g. ImageData. Alpha is ignored. */
export interface RGBAImage {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

export function maskArea(m: Mask): number {
  let n = 0;
  for (let i = 0; i < m.pix.length; i++) n += m.pix[i]!;
  return n;
}

export function computeMask(img: RGBAImage, p: TissueParams): Mask {
  const err = validateTissueParams(p);
  if (err) throw new Error(`tissue: ${err}`);
  if (img.width === 0 || img.height === 0) throw new Error('tissue: empty image');
  const m: Mask = { width: img.width, height: img.height, pix: threshold(img, p) };
  closing(m, p.closing_radius);
  removeSmallComponents(m, 1, p.min_object_area);
  removeSmallComponents(m, 0, p.min_hole_area);
  return m;
}

// Mirrors the Go channel functions: plain left-to-right float64 arithmetic,
// which JS evaluates identically (no FMA contraction).
const INV255 = 1.0 / 255;

export function gray(r: number, g: number, b: number): number {
  return r * INV255 * 0.2125 + g * INV255 * 0.7154 + b * INV255 * 0.0721;
}

/** Returns saturation; value is max(r, g, b) * INV255. */
export function saturation(r: number, g: number, b: number): number {
  const hi = Math.max(r, g, b);
  const lo = Math.min(r, g, b);
  if (hi === lo) return 0;
  const v = hi * INV255;
  return (v - lo * INV255) / v;
}

export function threshold(img: RGBAImage, p: TissueParams): Uint8Array {
  const n = img.width * img.height;
  const d = img.data;
  const out = new Uint8Array(n);
  switch (p.method) {
    case 'saturation-gray': {
      const st = p.saturation_threshold;
      const gt = p.gray_threshold;
      for (let i = 0, j = 0; i < n; i++, j += 4) {
        const r = d[j]!;
        const g = d[j + 1]!;
        const b = d[j + 2]!;
        out[i] = saturation(r, g, b) > st && gray(r, g, b) < gt ? 1 : 0;
      }
      break;
    }
    case 'otsu-saturation': {
      const sat = new Float64Array(n);
      for (let i = 0, j = 0; i < n; i++, j += 4) sat[i] = saturation(d[j]!, d[j + 1]!, d[j + 2]!);
      const t = otsuThreshold(sat);
      for (let i = 0, j = 0; i < n; i++, j += 4) {
        const v = Math.max(d[j]!, d[j + 1]!, d[j + 2]!) * INV255;
        out[i] = sat[i]! > t && v < OTSU_SATURATION_MAX_VALUE ? 1 : 0;
      }
      break;
    }
    case 'otsu-gray': {
      const gr = new Float64Array(n);
      for (let i = 0, j = 0; i < n; i++, j += 4) gr[i] = gray(d[j]!, d[j + 1]!, d[j + 2]!);
      const t = otsuThreshold(gr);
      for (let i = 0; i < n; i++) out[i] = gr[i]! < t ? 1 : 0;
      break;
    }
  }
  return out;
}
