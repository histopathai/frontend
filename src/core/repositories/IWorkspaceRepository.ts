import { Workspace } from '../entities/Workspace';
import type { PaginatedResult, QueryOptions } from '../types/common';
import type { BatchTransfer } from './common';

export interface CreateNewWorkspaceRequest {
  name: string;
  organ_type: string;
  organization: string;
  description: string;
  license: string;
  resource_url?: string;
  release_year?: number;
  annotation_types?: string[];
}

export interface UpdateWorkspaceRequest {
  name?: string;
  organ_type?: string;
  organization?: string;
  description?: string;
  license?: string;
  resource_url?: string | null;
  release_year?: number | null;
  annotation_types?: string[];
}

export interface IWorkspaceRepository {
  list(options?: QueryOptions): Promise<PaginatedResult<Workspace>>;
  getById(id: string): Promise<Workspace | null>;
  create(data: CreateNewWorkspaceRequest): Promise<Workspace>;
  update(id: string, data: UpdateWorkspaceRequest): Promise<void>;
  count(): Promise<number>;
  softDeleteMany(ids: string[]): Promise<void>;
  transferMany(data: BatchTransfer): Promise<void>;
}
