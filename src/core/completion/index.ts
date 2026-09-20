import type { TissueMaskStatus } from '@/core/entities/TissueMask';

/**
 * What "finished" means in a tab. Dataset labelling finishes an image with
 * "İşaretleme Tamamlandı", Doku Maskeleri with an approved or rejected mask.
 * The patch grid stores nothing, so nothing can be finished there.
 */
export type CompletionMode = 'labeling' | 'tissue' | 'none';

export interface CompletableImage {
  id: string;
  markedAsCompleted: boolean;
  width: number | null;
  height: number | null;
  isProcessed(): boolean;
}

export interface Progress {
  /** Every image, whether or not it counts as work in this tab. */
  images: number;
  /** Images that are work in this tab. */
  total: number;
  done: number;
}

export type MaskStatusLookup = (imageId: string) => TissueMaskStatus | undefined;

/** Approved and rejected are the terminal states, as in main-service workspace-stats. */
export function isMaskDone(status: TissueMaskStatus | undefined): boolean {
  return status === 'approved' || status === 'rejected';
}

/**
 * Same rule as main-service GetWorkspaceStats, so a patient and its workspace
 * agree on what is left: processed and larger than 3000 px on one side.
 */
export function needsTissueMask(image: CompletableImage): boolean {
  return image.isProcessed() && ((image.width ?? 0) > 3000 || (image.height ?? 0) > 3000);
}

function isWork(mode: CompletionMode, image: CompletableImage): boolean {
  if (mode === 'labeling') return true;
  if (mode === 'tissue') return needsTissueMask(image);
  return false;
}

function isDone(mode: CompletionMode, image: CompletableImage, maskStatus: MaskStatusLookup) {
  if (mode === 'labeling') return image.markedAsCompleted;
  if (mode === 'tissue') return isMaskDone(maskStatus(image.id));
  return false;
}

/** Nothing left to do on the image in this tab. */
export function isImageFinished(
  mode: CompletionMode,
  image: CompletableImage,
  maskStatus: MaskStatusLookup
): boolean {
  if (mode === 'none') return false;
  return isDone(mode, image, maskStatus) || !isWork(mode, image);
}

export function progressOf(
  mode: CompletionMode,
  images: CompletableImage[],
  maskStatus: MaskStatusLookup
): Progress {
  let total = 0;
  let done = 0;
  for (const image of images) {
    if (isDone(mode, image, maskStatus)) {
      total++;
      done++;
    } else if (isWork(mode, image)) {
      total++;
    }
  }
  return { images: images.length, total, done };
}

/** A patient without work is finished too: there is nothing to open it for. */
export function isProgressFinished(mode: CompletionMode, progress: Progress): boolean {
  if (mode === 'none') return false;
  return progress.done >= progress.total;
}

/**
 * First item after `currentId` that passes; from the start when `currentId` is
 * not in the list. Walks the full list so the position survives the current
 * item dropping out of the filtered one.
 */
export function nextMatching<T extends { id: string }>(
  items: T[],
  currentId: string | undefined,
  matches: (item: T) => boolean
): T | undefined {
  const index = items.findIndex((item) => item.id === currentId);
  return items.slice(index + 1).find(matches);
}

export function prevMatching<T extends { id: string }>(
  items: T[],
  currentId: string | undefined,
  matches: (item: T) => boolean
): T | undefined {
  const index = items.findIndex((item) => item.id === currentId);
  if (index <= 0) return undefined;
  return items.slice(0, index).reverse().find(matches);
}
