/** Widest tile a touch screen gets, in CSS px: one column on a phone, two or more on a tablet. */
const TOUCH_TILE_MAX = 400;

/**
 * CSS size of a test image tile. Every image pixel lands on a whole number of screen pixels,
 * so nothing is resampled and every image — real or synthetic — is drawn the same way.
 *
 * With a mouse the image is shown 1:1 (one screen pixel per image pixel). On a touch screen
 * 1:1 is too small to judge (85 CSS px on a 3× phone), so the image is enlarged by the largest
 * whole factor that still fits the available width: each image pixel becomes an n × n block
 * of screen pixels.
 */
export function blindTestTileSize(
  imagePx: number,
  pixelRatio: number,
  availableCss: number,
  touch: boolean
): number {
  const ratio = pixelRatio > 0 ? pixelRatio : 1;
  if (!touch) return imagePx / ratio;
  const fit = Math.min(availableCss, TOUCH_TILE_MAX) * ratio;
  const factor = Math.max(1, Math.floor(fit / imagePx));
  return (factor * imagePx) / ratio;
}
