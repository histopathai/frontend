import { onUnmounted } from 'vue';
import type { TissueParams } from '@/core/tissue';
import type {
  TissueWorkerRequest,
  TissueWorkerResponse,
  TissueWorkerResult,
} from '@/presentation/workers/tissueMask.worker';

/**
 * Decodes a tissue preview without color management (the pixels must match
 * what the Go worker decoded) and returns its RGBA pixels.
 */
export async function decodePreview(blob: Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(blob, {
    colorSpaceConversion: 'none',
    premultiplyAlpha: 'none',
  });
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Wraps the tissue mask worker. Only the latest compute request resolves;
 * superseded ones reject with a 'superseded' error so callers can ignore them.
 */
export function useTissueWorker() {
  const worker = new Worker(new URL('../../workers/tissueMask.worker.ts', import.meta.url), {
    type: 'module',
  });
  let nextRequestId = 0;
  let pending: {
    id: number;
    resolve: (r: TissueWorkerResult) => void;
    reject: (e: Error) => void;
  } | null = null;

  worker.onmessage = (event: MessageEvent<TissueWorkerResponse>) => {
    const msg = event.data;
    if (!pending || msg.requestId !== pending.id) return;
    const { resolve, reject } = pending;
    pending = null;
    if (msg.type === 'result') resolve(msg.result);
    else reject(new Error(msg.message));
  };

  function post(msg: TissueWorkerRequest, transfer: Transferable[] = []) {
    worker.postMessage(msg, transfer);
  }

  function setImage(imageKey: string, pixels: ImageData) {
    // Copy so the caller's ImageData stays usable after the buffer is transferred.
    const data = new Uint8ClampedArray(pixels.data);
    post({ type: 'setImage', imageKey, width: pixels.width, height: pixels.height, data }, [
      data.buffer,
    ]);
  }

  function compute(
    imageKey: string,
    params: TissueParams,
    level0Width: number,
    level0Height: number
  ): Promise<TissueWorkerResult> {
    pending?.reject(new Error('superseded'));
    const id = ++nextRequestId;
    return new Promise((resolve, reject) => {
      pending = { id, resolve, reject };
      post({
        type: 'compute',
        requestId: id,
        imageKey,
        params: { ...params },
        level0Width,
        level0Height,
      });
    });
  }

  onUnmounted(() => {
    pending?.reject(new Error('superseded'));
    worker.terminate();
  });

  return { setImage, compute };
}
