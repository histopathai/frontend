import { Annotation } from '../entities/Annotation';
import type { PaginatedResult, Pagination } from '../types/common';
import { Point } from '../value-objects/Point';

export interface TagValueRequest {
  tag_type: string;
  tag_name: string;
  value: any;
  color?: string;
  global?: boolean;
}

export interface ParentRefRequest {
  id: string;
  type: 'image' | 'patient' | 'workspace';
}

export interface CreateNewAnnotationRequest {
  parent: ParentRefRequest;
  polygon?: Point[];
  tag: TagValueRequest;
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
