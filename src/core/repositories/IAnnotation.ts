import { Annotation } from '../entities/Annotation';
import type { PaginatedResult, Pagination } from '../types/common';
import { Point } from '../value-objects/Point';

export interface CreateNewAnnotationRequest {
  image_id: string;
  annotator_id: string;
  polygon: Point[];
  score?: number;
  class?: string;
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
