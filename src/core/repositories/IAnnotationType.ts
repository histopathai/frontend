import { AnnotationType } from '../entities/AnnotationType';
import type { AnnotationInputType } from '../entities/AnnotationType';
import type { PaginatedResult, Pagination } from '../types/common';

export interface CreateNewAnnotationTypeRequest {
  workspace_id: string;
  name: string;
  input_type: AnnotationInputType;
  description?: string;
  required?: boolean;

  // Tip spesifik alanlar
  class_list?: string[]; // Seçenekler için (Select/MultiSelect)
  score_min?: number; // Sayısal aralık için
  score_max?: number;

  // Görsel ve hiyerarşi (opsiyonel)
  parent_id?: string;
  color?: string;

  // Legacy support (eski kodların patlamaması için opsiyonel bırakıldı)
  creator_id?: string;
  score_enabled?: boolean;
  classification_enabled?: boolean;
  score_name?: string;
}

export interface UpdateAnnotationTypeRequest {
  name?: string;
  description?: string;
  parent_id?: string;
  color?: string;
  required?: boolean;

  score_name?: string;
  score_min?: number;
  score_max?: number;
  class_list?: string[];
}

export interface IAnnotationType {
  list(pagination: Pagination): Promise<PaginatedResult<AnnotationType>>;
  getById(id: string): Promise<AnnotationType>;
  create(data: CreateNewAnnotationTypeRequest): Promise<AnnotationType>;
  update(id: string, data: UpdateAnnotationTypeRequest): Promise<void>;
  delete(id: string): Promise<void>;
  batchDelete(ids: string[]): Promise<void>;
  count(): Promise<number>;
}
