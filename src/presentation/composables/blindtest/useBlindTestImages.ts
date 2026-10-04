import { onBeforeUnmount, reactive } from 'vue';
import { repositories } from '@/services';

const CONCURRENCY = 6;

/**
 * Loads the images of a blind test as object URLs (the image route needs the
 * auth header, so a plain <img src> cannot fetch it). A few requests at a time,
 * in the order asked; the URLs are released when the component goes away.
 */
export function useBlindTestImages() {
  const urls = reactive<Record<string, string>>({});
  const failed = reactive<Record<string, boolean>>({});
  let queue: { testId: string; imageId: string }[] = [];
  let running = 0;
  let generation = 0;

  function pump() {
    while (running < CONCURRENCY && queue.length) {
      const job = queue.shift()!;
      if (urls[job.imageId]) continue;
      running++;
      const gen = generation;
      repositories.blindTest
        .image(job.testId, job.imageId)
        .then((blob) => {
          if (gen === generation) urls[job.imageId] = URL.createObjectURL(blob);
        })
        .catch(() => {
          if (gen === generation) failed[job.imageId] = true;
        })
        .finally(() => {
          running--;
          pump();
        });
    }
  }

  /** Loads the images of a test, first ids first. */
  function load(testId: string, imageIds: string[]) {
    queue = imageIds.filter((id) => !urls[id]).map((imageId) => ({ testId, imageId }));
    pump();
  }

  function retry(testId: string, imageId: string) {
    delete failed[imageId];
    queue.unshift({ testId, imageId });
    pump();
  }

  function clear() {
    generation++;
    queue = [];
    for (const id of Object.keys(urls)) {
      URL.revokeObjectURL(urls[id]!);
      delete urls[id];
    }
    for (const id of Object.keys(failed)) delete failed[id];
  }

  onBeforeUnmount(clear);
  return { urls, failed, load, retry, clear };
}
