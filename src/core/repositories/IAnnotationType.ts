import { AnnotationType } from '../entities/AnnotationType';
import type { PaginatedResult, QueryOptions } from '../types/common';

export interface CreateNewAnnotationTypeRequest {
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

export interface IAnnotationTypeRepository {
  list(options?: QueryOptions): Promise<PaginatedResult<AnnotationType>>;
  listByParent(parentId: string, options?: QueryOptions): Promise<PaginatedResult<AnnotationType>>;
  getById(id: string): Promise<AnnotationType>;
  create(data: CreateNewAnnotationTypeRequest): Promise<AnnotationType>;
  update(id: string, data: UpdateAnnotationTypeRequest): Promise<void>;
  delete(id: string): Promise<void>;
  softDeleteMany(ids: string[]): Promise<void>;
  count(): Promise<number>;
}
