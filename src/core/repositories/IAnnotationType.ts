import { AnnotationType } from '../entities/AnnotationType';
import type { PaginatedResult, Pagination } from '../types/common';

export interface CreateNewAnnotationTypeRequest {
  creatorId: string;
  name: string;
  description?: string;
  scoreEnabled: boolean;
  classificationEnabled: boolean;
  scorename?: string;
  scoremin?: number;
  scoremax?: number;
  classList?: string[];
}

export interface IAnnotationType {
  list(pagination: Pagination): Promise<PaginatedResult<AnnotationType>>;
  getById(id: string): Promise<AnnotationType>;
  create(data: CreateNewAnnotationTypeRequest): Promise<AnnotationType>;
  update(id: string, data: Partial<CreateNewAnnotationTypeRequest>): Promise<void>;
  delete(id: string): Promise<void>;
}
