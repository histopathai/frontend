import type { ParentRefRequest } from './common';

export interface Point {
  x: number;
  y: number;
}

export interface CreateAnnotationRequest {
  parent: ParentRefRequest;
  ws_id: string;
  name: string;
  tag_type: string;
  value: any;
  is_global?: boolean;
  color?: string;
  polygon?: Point[];
}

export interface UpdateAnnotationRequest {
  creator_id?: string;
  value?: any;
  is_global?: boolean;
  color?: string;
  polygon?: Point[];
}
