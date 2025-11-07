import { Workspace } from '../entities/Workspace';
import type { PaginatedResult, Pagination } from '../types/common';

export interface CreateNewWorkspaceRequest {
  name: string;
  organType: string;
  organization: string;
  description: string;
  license: string;
  resourceURL?: string;
  releaseYear?: number;
  annotationTypeId?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  organType?: string;
  organization?: string;
  description?: string;
  license?: string;
  resourceURL?: string | null;
  releaseYear?: number | null;
  annotationTypeId?: string | null;
}

export interface IWorkspaceRepository {
  list(pagination: Pagination): Promise<PaginatedResult<Workspace>>;
  getById(id: string): Promise<Workspace | null>;
  create(data: CreateNewWorkspaceRequest): Promise<Workspace>;
  update(id: string, data: UpdateWorkspaceRequest): Promise<Workspace>;
  delete(id: string): Promise<void>;
}
