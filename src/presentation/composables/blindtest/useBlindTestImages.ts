import { onBeforeUnmount, reactive } from 'vue';

const CONCURRENCY = 6;

/**
 * Loads the images of a blind test as object URLs (the image routes need an
 * auth header, so a plain <img src> cannot fetch them). A few requests at a
 * time, in the order asked; the URLs are released when the component goes away.
 * fetchImage is how an image is fetched: the user's or a guest's route.
 */
export function useBlindTestImages() {
  const urls = reactive<Record<string, string>>({});
  const failed = reactive<Record<string, boolean>>({});
  let queue: string[] = [];
  let fetchImage: (imageId: string) => Promise<Blob> = () => Promise.reject(new Error('no loader'));
  let running = 0;
  let generation = 0;

  function pump() {
    while (running < CONCURRENCY && queue.length) {
      const imageId = queue.shift()!;
      if (urls[imageId]) continue;
      running++;
      const gen = generation;
      fetchImage(imageId)
        .then((blob) => {
          if (gen === generation) urls[imageId] = URL.createObjectURL(blob);
        })
        .catch(() => {
          if (gen === generation) failed[imageId] = true;
        })
        .finally(() => {
          running--;
          pump();
        });
    }
  }

  /** Loads the images, first ids first, with fetch. */
  function load(imageIds: string[], fetch: (imageId: string) => Promise<Blob>) {
    fetchImage = fetch;
    queue = imageIds.filter((id) => !urls[id]);
    pump();
  }

  function retry(imageId: string) {
    delete failed[imageId];
    queue.unshift(imageId);
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
