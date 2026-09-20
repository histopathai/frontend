import { describe, expect, it } from 'vitest';
import {
  isImageFinished,
  isProgressFinished,
  needsTissueMask,
  nextMatching,
  prevMatching,
  progressOf,
  type CompletableImage,
} from '../index';
import type { TissueMaskStatus } from '@/core/entities/TissueMask';

function image(id: string, over: Partial<CompletableImage> & { processed?: boolean } = {}) {
  const { processed = true, ...rest } = over;
  return {
    id,
    markedAsCompleted: false,
    width: 40000,
    height: 30000,
    isProcessed: () => processed,
    ...rest,
  } satisfies CompletableImage;
}

const noMasks = () => undefined;
const masks = (statuses: Record<string, TissueMaskStatus>) => (id: string) => statuses[id];

describe('needsTissueMask', () => {
  it('follows main-service workspace-stats: processed and over 3000 px on one side', () => {
    expect(needsTissueMask(image('a'))).toBe(true);
    expect(needsTissueMask(image('a', { width: 3001, height: 100 }))).toBe(true);
    expect(needsTissueMask(image('a', { width: 3000, height: 3000 }))).toBe(false);
    expect(needsTissueMask(image('a', { width: null, height: null }))).toBe(false);
    expect(needsTissueMask(image('a', { processed: false }))).toBe(false);
  });
});

describe('isImageFinished', () => {
  it('labelling: finished once marked as completed', () => {
    expect(isImageFinished('labeling', image('a'), noMasks)).toBe(false);
    expect(isImageFinished('labeling', image('a', { markedAsCompleted: true }), noMasks)).toBe(true);
  });

  it('tissue: finished with an approved or rejected mask, whatever the labelling says', () => {
    const done = image('a', { markedAsCompleted: true });
    expect(isImageFinished('tissue', done, noMasks)).toBe(false);
    expect(isImageFinished('tissue', done, masks({ a: 'auto' }))).toBe(false);
    expect(isImageFinished('tissue', done, masks({ a: 'edited' }))).toBe(false);
    expect(isImageFinished('tissue', image('a'), masks({ a: 'approved' }))).toBe(true);
    expect(isImageFinished('tissue', image('a'), masks({ a: 'rejected' }))).toBe(true);
  });

  it('tissue: an image that needs no mask leaves nothing to do', () => {
    expect(isImageFinished('tissue', image('a', { width: 800, height: 600 }), noMasks)).toBe(true);
  });

  it('none: nothing is ever finished', () => {
    expect(isImageFinished('none', image('a', { markedAsCompleted: true }), noMasks)).toBe(false);
  });
});

describe('progressOf', () => {
  it('counts every image of the patient, not the first page of 20', () => {
    const images = Array.from({ length: 25 }, (_, i) =>
      image(`img-${i}`, { markedAsCompleted: i < 20 })
    );
    const progress = progressOf('labeling', images, noMasks);
    expect(progress).toEqual({ images: 25, total: 25, done: 20 });
    expect(isProgressFinished('labeling', progress)).toBe(false);
  });

  it('tissue: only images that need a mask are work', () => {
    const images = [image('big'), image('done'), image('small', { width: 500, height: 500 })];
    const progress = progressOf('tissue', images, masks({ done: 'approved' }));
    expect(progress).toEqual({ images: 3, total: 2, done: 1 });
    expect(isProgressFinished('tissue', progress)).toBe(false);
    expect(
      isProgressFinished('tissue', progressOf('tissue', images, masks({ done: 'approved', big: 'rejected' })))
    ).toBe(true);
  });

  it('a patient without work is finished, except where nothing can be', () => {
    expect(isProgressFinished('labeling', progressOf('labeling', [], noMasks))).toBe(true);
    expect(isProgressFinished('none', progressOf('none', [], noMasks))).toBe(false);
  });
});

describe('nextMatching / prevMatching', () => {
  const items = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
  const not = (...ids: string[]) => (item: { id: string }) => !ids.includes(item.id);

  it('steps from the current item even when it no longer passes itself', () => {
    expect(nextMatching(items, 'b', not('b', 'c'))?.id).toBe('d');
    expect(prevMatching(items, 'c', not('b', 'c'))?.id).toBe('a');
  });

  it('starts from the top without a current item and stops at the ends', () => {
    expect(nextMatching(items, undefined, not('a'))?.id).toBe('b');
    expect(nextMatching(items, 'd', not())).toBeUndefined();
    expect(prevMatching(items, 'a', not())).toBeUndefined();
    expect(prevMatching(items, undefined, not())).toBeUndefined();
  });
});
