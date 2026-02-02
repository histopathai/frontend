import type { ParentRefResponse } from './common';

export interface PointResponse {
  x: number;
  y: number;
}

export interface AnnotationResponse {
  id: string;
  entity_type: string;
  name: string;
  creator_id: string;
  parent: ParentRefResponse;
  ws_id: string;
  annotation_type_id: string;
  tag_type: string;
  value: any;
  is_global: boolean;
  color: string;
  polygon: PointResponse[];
  created_at: string;
  updated_at: string;
}
