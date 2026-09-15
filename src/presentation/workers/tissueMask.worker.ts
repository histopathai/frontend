// Recomputes tissue masks off the main thread. The preview pixels are sent
// once per image; later requests only carry parameters.
import {
  computeTissue,
  type RGBAImage,
  type TissueComputation,
  type TissueParams,
} from '@/core/tissue';

export type TissueWorkerRequest =
  | { type: 'setImage'; imageKey: string; width: number; height: number; data: Uint8ClampedArray }
  | {
      type: 'compute';
      requestId: number;
      imageKey: string;
      params: TissueParams;
      level0Width: number;
      level0Height: number;
    };

export type TissueWorkerResult = Omit<TissueComputation, 'mask'> & { elapsedMs: number };

export type TissueWorkerResponse =
  | { type: 'result'; requestId: number; result: TissueWorkerResult }
  | { type: 'error'; requestId: number; message: string };

interface WorkerScope {
  onmessage: ((event: MessageEvent<TissueWorkerRequest>) => void) | null;
  postMessage(message: TissueWorkerResponse): void;
}

const scope = self as unknown as WorkerScope;
let image: { key: string; pixels: RGBAImage } | null = null;

// Requests that arrive while a mask is being computed are coalesced: only the
// newest one runs. Superseded requests get no answer (the caller already moved on).
let latest: Extract<TissueWorkerRequest, { type: 'compute' }> | null = null;
let scheduled = false;

scope.onmessage = (event) => {
  const msg = event.data;
  if (msg.type === 'setImage') {
    image = { key: msg.imageKey, pixels: { width: msg.width, height: msg.height, data: msg.data } };
    return;
  }
  latest = msg;
  if (!scheduled) {
    scheduled = true;
    setTimeout(run, 0);
  }
};

function run() {
  scheduled = false;
  const msg = latest;
  latest = null;
  if (!msg) return;

  if (!image || image.key !== msg.imageKey) {
    scope.postMessage({ type: 'error', requestId: msg.requestId, message: 'preview not loaded' });
    return;
  }
  try {
    const start = performance.now();
    const { mask: _mask, ...result } = computeTissue(
      image.pixels,
      msg.params,
      msg.level0Width,
      msg.level0Height
    );
    scope.postMessage({
      type: 'result',
      requestId: msg.requestId,
      result: { ...result, elapsedMs: performance.now() - start },
    });
  } catch (e: any) {
    scope.postMessage({
      type: 'error',
      requestId: msg.requestId,
      message: e?.message || String(e),
    });
  }
}
