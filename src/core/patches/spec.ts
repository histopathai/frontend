// The patch target, a port of `PatchSpec` / `patch_spec` in dev-ingestor's
// histopathai/imaging/patches.py. The target is `patchSize` pixels at `mpp`
// microns per pixel and nothing else; everything stored is in level-0 pixels.

/**
 * Rounds half to even, as Python's `round` and numpy's `rint` do. `Math.round`
 * rounds half up, which would put every patch of a 2.5 px stride one pixel off
 * from the grid dev-ingestor produces.
 */
export function roundHalfEven(x: number): number {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff < 0.5) return floor;
  if (diff > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1;
}

/** `np.round(x, 4)`. */
export function round4(x: number): number {
  return roundHalfEven(x * 1e4) / 1e4;
}

export interface PatchSpec {
  patchSize: number;
  /** Target resolution, µm per pixel. */
  mpp: number;
  /** Level-0 resolution of the slide, µm per pixel. */
  baseMpp: number;
  /** Share of a patch that the next one repeats, in [0, 1). */
  overlap: number;
  /** Side of one patch in level-0 pixels. */
  size0: number;
  /** Grid step in level-0 pixels; not an integer in general. */
  stride0: number;
}

export function patchSpec(patchSize: number, mpp: number, baseMpp: number, overlap = 0): PatchSpec {
  if (!(Number.isFinite(mpp) && mpp > 0)) {
    throw new Error('mpp, pozitif bir µm/piksel değeri olmalı');
  }
  if (!(Number.isInteger(patchSize) && patchSize > 0)) {
    throw new Error('patch_size, pozitif bir piksel sayısı olmalı');
  }
  if (!(overlap >= 0 && overlap < 1)) {
    throw new Error('overlap, [0, 1) aralığında olmalı');
  }
  if (!(Number.isFinite(baseMpp) && baseMpp > 0)) {
    throw new Error('Bu görüntünün mpp değeri yok');
  }
  return {
    patchSize,
    mpp,
    baseMpp,
    overlap,
    size0: Math.max(1, roundHalfEven((patchSize * mpp) / baseMpp)),
    stride0: (Math.max(1, roundHalfEven(patchSize * (1 - overlap))) * mpp) / baseMpp,
  };
}

/** A target finer than the scan: patches would be upsampled, no real detail is gained. */
export function isUpsampled(spec: PatchSpec): boolean {
  return spec.mpp / spec.baseMpp < 0.98;
}

/** Same sentence as `PatchSpec.__str__`, so the panel and a notebook read alike. */
export function describeSpec(spec: PatchSpec): string {
  const overlap = spec.overlap ? `, overlap ${Math.round(spec.overlap * 100)}%` : '';
  return (
    `${spec.patchSize}px @ mpp ${spec.mpp} = ${(spec.patchSize * spec.mpp).toFixed(0)} µm  →  ` +
    `level-0'da ${spec.size0}px (slayt mpp ${spec.baseMpp.toFixed(4)})${overlap}`
  );
}
