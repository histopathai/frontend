import type { ParentRefResponse } from './common';

export interface MagnificationResponse {
  objective?: number;
  native_level?: number;
  scan_magnification?: number;
}

export interface ImageResponse {
  id: string;
  entity_type: string;
  name: string;
  creator_id: string;
  ws_id: string;
  parent: ParentRefResponse;
  format: string;
  width?: number;
  height?: number;
  magnification?: MagnificationResponse;
  status: string;
  created_at: string;
  updated_at: string;
}
