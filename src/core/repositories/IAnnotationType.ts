import { AnnotationType } from '../entities/AnnotationType';
import type { PaginatedResult, Pagination } from '../types/common';

export interface CreateNewAnnotationTypeRequest {
  creator_id: string;
  name: string;
  description?: string;
  score_enabled: boolean;
  classification_enabled: boolean;
  score_name?: string;
  score_min?: number;
  score_max?: number;
  class_list?: string[];
}

export interface IAnnotationType {
  list(pagination: Pagination): Promise<PaginatedResult<AnnotationType>>;
  getById(id: string): Promise<AnnotationType>;
  create(data: CreateNewAnnotationTypeRequest): Promise<AnnotationType>;
  update(id: string, data: Partial<CreateNewAnnotationTypeRequest>): Promise<void>;
  delete(id: string): Promise<void>;
}
