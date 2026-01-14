import { Annotation } from '../entities/Annotation';
import type { PaginatedResult, Pagination } from '../types/common';
import { Point } from '../value-objects/Point';

// Backend'deki "TagValueRequest" yapısı
export interface TagValueRequest {
  tag_type: string;
  tag_name: string;
  value: any;
  color?: string;
  global?: boolean;
}

// Backend'deki "ParentRefRequest" yapısı
export interface ParentRefRequest {
  id: string;
  type: 'image' | 'patient' | 'workspace';
}

// GÜNCELLENMİŞ REQUEST YAPISI
export interface CreateNewAnnotationRequest {
  parent: ParentRefRequest;
  polygon?: Point[]; // Global etiketler için boş olabilir
  tag: TagValueRequest; // Backend tek bir 'tag' bekliyor, 'data' değil
  // Aşağıdaki alanlar backend struct'ında yoksa kaldırılabilir veya opsiyonel bırakılabilir
  description?: string;
}

export interface IAnnotationRepository {
  getByImageId(imageId: string, pagination: Pagination): Promise<PaginatedResult<Annotation>>;
  create(data: CreateNewAnnotationRequest): Promise<Annotation>;
  getById(id: string): Promise<Annotation>;
  update(id: string, data: Partial<CreateNewAnnotationRequest>): Promise<void>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
  batchDelete(ids: string[]): Promise<void>;
}
