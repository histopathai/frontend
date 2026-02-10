import { Annotation } from '../entities/Annotation';
import type { PaginatedResult, QueryOptions } from '../types/common';
import { Point } from '../value-objects/Point';

export interface ParentRef {
  id: string;
  type: string;
}
export interface CreateNewAnnotationRequest {
  parent: ParentRef;
  ws_id: string;
  name: string;
  tag_type: string;
  value: any;
  is_global?: boolean;
  color?: string;
  polygon?: Point[];
}

export interface IAnnotationRepository {
  listByImage(imageId: string, options?: QueryOptions): Promise<PaginatedResult<Annotation>>;
  listByParent(parentId: string, options?: QueryOptions): Promise<PaginatedResult<Annotation>>;
  listByWorkspace(
    workspaceId: string,
    options?: QueryOptions
  ): Promise<PaginatedResult<Annotation>>;
  create(data: CreateNewAnnotationRequest): Promise<Annotation>;
  getById(id: string): Promise<Annotation>;
  update(id: string, data: Partial<CreateNewAnnotationRequest>): Promise<void>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
  softDeleteMany(ids: string[]): Promise<void>;
}
