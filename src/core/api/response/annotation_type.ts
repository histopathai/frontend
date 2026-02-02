export interface AnnotationTypeResponse {
  id: string;
  entity_type: string;
  name: string;
  creator_id: string;
  tag_type: string;
  options?: string[];
  is_global: boolean;
  is_required: boolean;
  color?: string;
  min?: number;
  max?: number;
  created_at: string;
  updated_at: string;
}
