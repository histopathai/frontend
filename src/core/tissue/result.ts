import { computeMask, maskArea, type Mask, type RGBAImage } from './mask';
import { MAX_POINTS, MAX_SIMPLIFY_TOLERANCE, type TissueParams } from './params';
import { extractPolygons, pointCount, type TissuePolygon } from './polygon';

export interface TissueComputation {
  params: TissueParams;
  previewWidth: number;
  previewHeight: number;
  downsampleX: number;
  downsampleY: number;
  tissueAreaRatio: number;
  polygons: TissuePolygon[];
  mask: Mask;
}

/**
 * Computes a tissue mask on a preview and returns polygons in level-0 pixels.
 * Like the Go worker, the simplify tolerance is doubled while the polygons
 * exceed MAX_POINTS; params reports the tolerance actually used.
 */
export function computeTissue(
  img: RGBAImage,
  params: TissueParams,
  level0Width: number,
  level0Height: number
): TissueComputation {
  if (!(level0Width > 0 && level0Height > 0)) {
    throw new Error(`tissue: invalid level-0 size ${level0Width}x${level0Height}`);
  }
  const p = { ...params };
  const mask = computeMask(img, p);
  const dsX = level0Width / mask.width;
  const dsY = level0Height / mask.height;

  let polygons = extractPolygons(mask, p.simplify_tolerance, dsX, dsY);
  while (pointCount(polygons) > MAX_POINTS) {
    const next = Math.max(p.simplify_tolerance * 2, 1);
    if (next > MAX_SIMPLIFY_TOLERANCE) {
      throw new Error(
        `tissue: ${pointCount(polygons)} polygon points exceed ${MAX_POINTS} at the maximum simplify tolerance`
      );
    }
    p.simplify_tolerance = next;
    polygons = extractPolygons(mask, p.simplify_tolerance, dsX, dsY);
  }

  return {
    params: p,
    previewWidth: mask.width,
    previewHeight: mask.height,
    downsampleX: dsX,
    downsampleY: dsY,
    tissueAreaRatio: maskArea(mask) / mask.pix.length,
    polygons,
    mask,
  };
}
