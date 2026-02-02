export interface CreateAnnotationTypeRequest {
  name: string;
  tag_type: string;
  options?: string[];
  is_global?: boolean;
  is_required?: boolean;
  color?: string;
  min?: number;
  max?: number;
}

export interface UpdateAnnotationTypeRequest {
  creator_id?: string;
  name?: string;
  options?: string[];
  is_global?: boolean;
  is_required?: boolean;
  color?: string;
  min?: number;
  max?: number;
}
