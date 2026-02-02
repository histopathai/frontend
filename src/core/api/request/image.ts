import type { ParentRefRequest } from './common';

export interface MagnificationRequest {
  objective?: number;
  native_level?: number;
  scan_magnification?: number;
}

export interface ContentRequest {
  content_type: string;
  name: string;
  size: number;
}

export interface UploadImageRequest {
  parent: ParentRefRequest;
  name: string;
  ws_id: string;
  format: string;
  contents: ContentRequest[];
  width?: number;
  height?: number;
  magnification?: MagnificationRequest;
}
