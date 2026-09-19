// Colours of the patch overlay.

/** Viridis in 32 steps: dark = low, yellow = high; legible on H&E and for colour-blind viewers. */
const VIRIDIS: [number, number, number][] = [
  [68, 1, 84],
  [72, 40, 120],
  [62, 74, 137],
  [49, 104, 142],
  [38, 130, 142],
  [31, 158, 137],
  [53, 183, 121],
  [109, 205, 89],
  [180, 222, 44],
  [253, 231, 37],
];

export const RAMP: string[] = Array.from({ length: 32 }, (_, i) => {
  const t = (i / 31) * (VIRIDIS.length - 1);
  const a = VIRIDIS[Math.floor(t)]!;
  const b = VIRIDIS[Math.min(VIRIDIS.length - 1, Math.floor(t) + 1)]!;
  const f = t - Math.floor(t);
  const mix = (k: number) => Math.round(a[k]! + (b[k]! - a[k]!) * f);
  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
});

/** A 0–1 value as an index into RAMP; NaN (not applicable) reads as 0. */
export function rampBin(value: number): number {
  if (!(value > 0)) return 0;
  return Math.min(RAMP.length - 1, Math.floor(value * RAMP.length));
}

export const RAMP_CSS = `linear-gradient(to right, ${RAMP.filter((_, i) => i % 4 === 0 || i === 31).join(', ')})`;

// Distinct hues that hold up on pink-purple tissue; labels take them in sorted order.
const LABEL_COLORS = [
  '#22d3ee',
  '#facc15',
  '#4ade80',
  '#f97316',
  '#60a5fa',
  '#f472b6',
  '#a3e635',
  '#c084fc',
  '#2dd4bf',
  '#fb7185',
];

export function labelColor(index: number): string {
  return LABEL_COLORS[index % LABEL_COLORS.length]!;
}
