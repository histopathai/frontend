const BINS = 256;

/**
 * skimage.filters.threshold_otsu(values, nbins=256), including numpy's bin
 * assignment. skimage keeps the class weights in float32, so their product is
 * rounded with Math.fround exactly like the Go port.
 */
export function otsuThreshold(values: Float64Array): number {
  let first = values[0]!;
  let last = values[0]!;
  for (let i = 1; i < values.length; i++) {
    const v = values[i]!;
    if (v < first) first = v;
    if (v > last) last = v;
  }
  if (first === last) return first;

  const edges = new Float64Array(BINS + 1);
  const step = (last - first) / BINS;
  for (let i = 0; i < BINS; i++) edges[i] = i * step + first;
  edges[BINS] = last;

  const counts = new Float64Array(BINS);
  const denom = last - first;
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    let idx = Math.trunc(((v - first) / denom) * BINS);
    if (idx === BINS) idx--;
    if (v < edges[idx]!) idx--;
    if (idx !== BINS - 1 && v >= edges[idx + 1]!) idx++;
    counts[idx]!++;
  }

  const centers = new Float64Array(BINS);
  for (let i = 0; i < BINS; i++) centers[i] = (edges[i]! + edges[i + 1]!) / 2.0;

  const weight1 = new Float64Array(BINS);
  const weight2 = new Float64Array(BINS);
  const mean1 = new Float64Array(BINS);
  const mean2 = new Float64Array(BINS);
  let w = 0;
  let s = 0;
  for (let i = 0; i < BINS; i++) {
    w += counts[i]!;
    s += counts[i]! * centers[i]!;
    weight1[i] = w;
    mean1[i] = s / w;
  }
  w = 0;
  s = 0;
  for (let i = BINS - 1; i >= 0; i--) {
    w += counts[i]!;
    s += counts[i]! * centers[i]!;
    weight2[i] = w;
    mean2[i] = s / w;
  }

  let best = 0;
  let bestIdx = 0;
  for (let i = 0; i < BINS - 1; i++) {
    const d = mean1[i]! - mean2[i + 1]!;
    const variance = Math.fround(weight1[i]! * weight2[i + 1]!) * (d * d);
    if (i === 0 || variance > best) {
      best = variance;
      bestIdx = i;
    }
  }
  return centers[bestIdx]!;
}
