import { Workspace } from '../entities/Workspace';
import type { PaginatedResult, Pagination } from '../types/common';

export interface CreateNewWorkspaceRequest {
  name: string;
  organ_type: string;
  organization: string;
  description: string;
  license: string;
  resource_url?: string;
  release_year?: number;
  annotation_type_id?: string | null;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  organ_type?: string;
  organization?: string;
  description?: string;
  license?: string;
  resource_url?: string | null;
  release_year?: number | null;
  annotation_type_id?: string | null;
}

export interface IWorkspaceRepository {
  list(pagination: Pagination): Promise<PaginatedResult<Workspace>>;
  getById(id: string): Promise<Workspace | null>;
  create(data: CreateNewWorkspaceRequest): Promise<Workspace>;
  update(id: string, data: UpdateWorkspaceRequest): Promise<void>;
  delete(id: string): Promise<void>;
}
