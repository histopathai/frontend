// Port of image-processing-service/internal/tissue. The worker stores the
// default mask computed in Go; this port recomputes it live in the browser, so
// both must produce identical output (see __tests__/tissue.spec.ts).

export type TissueMethod = 'saturation-gray' | 'otsu-saturation' | 'otsu-gray';

export const TISSUE_METHODS: TissueMethod[] = ['saturation-gray', 'otsu-saturation', 'otsu-gray'];

/** Mask parameters as stored in tissue_masks.params. Areas are in preview pixels. */
export interface TissueParams {
  method: TissueMethod;
  /** Used by saturation-gray only. */
  saturation_threshold: number;
  /** Used by saturation-gray only. */
  gray_threshold: number;
  /** Disk radius for morphological closing; 0 disables it. */
  closing_radius: number;
  /** Tissue components with area <= this value are removed; 0 disables it. */
  min_object_area: number;
  /** Holes with area <= this value are filled; 0 disables it. */
  min_hole_area: number;
  /** Douglas-Peucker tolerance in preview pixels; 0 keeps every boundary corner. */
  simplify_tolerance: number;
}

export const ALGORITHM_VERSION = 'tissue-v1';
export const MAX_CLOSING_RADIUS = 64;
export const MAX_SIMPLIFY_TOLERANCE = 16;
/** Keeps the Firestore document well below 1 MiB. */
export const MAX_POINTS = 40000;
export const OTSU_SATURATION_MAX_VALUE = 0.95;

export function defaultTissueParams(): TissueParams {
  return {
    method: 'saturation-gray',
    saturation_threshold: 0.05,
    gray_threshold: 0.92,
    closing_radius: 3,
    min_object_area: 500,
    min_hole_area: 500,
    simplify_tolerance: 1,
  };
}

export function validateTissueParams(p: TissueParams): string | null {
  if (!TISSUE_METHODS.includes(p.method)) return `unknown method ${p.method}`;
  if (!(p.saturation_threshold >= 0 && p.saturation_threshold <= 1)) {
    return 'saturation_threshold must be in [0, 1]';
  }
  if (!(p.gray_threshold >= 0 && p.gray_threshold <= 1)) return 'gray_threshold must be in [0, 1]';
  if (
    !Number.isInteger(p.closing_radius) ||
    p.closing_radius < 0 ||
    p.closing_radius > MAX_CLOSING_RADIUS
  ) {
    return `closing_radius must be an integer in [0, ${MAX_CLOSING_RADIUS}]`;
  }
  if (!Number.isInteger(p.min_object_area) || p.min_object_area < 0) {
    return 'min_object_area must be a non-negative integer';
  }
  if (!Number.isInteger(p.min_hole_area) || p.min_hole_area < 0) {
    return 'min_hole_area must be a non-negative integer';
  }
  if (!(p.simplify_tolerance >= 0 && p.simplify_tolerance <= MAX_SIMPLIFY_TOLERANCE)) {
    return `simplify_tolerance must be in [0, ${MAX_SIMPLIFY_TOLERANCE}]`;
  }
  return null;
}
