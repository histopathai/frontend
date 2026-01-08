import { AnnotationType } from '../entities/AnnotationType';
import type { PaginatedResult, Pagination } from '../types/common';
import type { TagType } from '../types/tags';

export interface TagRequest {
  name: string;
  type: TagType | string;
  options?: string[];
  global?: boolean;
  min?: number;
  max?: number;
  color?: string;
}

export interface CreateNewAnnotationTypeRequest {
  name: string;
  parent_id?: string;
  description?: string;
  color?: string;
  tags: TagRequest[];

  // Eski uyumluluk için
  workspace_id?: string;
  input_type?: any;
  class_list?: string[];
  score_min?: number;
  score_max?: number;
}

export interface UpdateAnnotationTypeRequest {
  name?: string;
  description?: string;
  parent_id?: string;
  color?: string;
  tags?: TagRequest[];

  score_name?: string;
  score_min?: number;
  score_max?: number;
  class_list?: string[];
}

export interface IAnnotationTypeRepository {
  list(pagination: Pagination): Promise<PaginatedResult<AnnotationType>>;

  getByParentId(parentId: string, pagination: Pagination): Promise<PaginatedResult<AnnotationType>>;

  getById(id: string): Promise<AnnotationType>;
  create(data: CreateNewAnnotationTypeRequest): Promise<AnnotationType>;
  update(id: string, data: UpdateAnnotationTypeRequest): Promise<void>;
  delete(id: string): Promise<void>;
  batchDelete(ids: string[]): Promise<void>;
  count(): Promise<number>;
}
