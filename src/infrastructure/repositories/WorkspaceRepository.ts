import type {
  IWorkspaceRepository,
  CreateNewWorkspaceRequest,
  UpdateWorkspaceRequest,
} from '@/core/repositories/IWorkspaceRepository';
import type { BatchTransfer } from '@/core/repositories/common';
import type { PaginatedResult, QueryOptions } from '@/core/types/common';

import { Workspace } from '@/core/entities/Workspace';
import { ApiClient } from '../api/ApiClient';

export class WorkspaceRepository implements IWorkspaceRepository {
  constructor(private apiClient: ApiClient) {}

  async list(options?: QueryOptions): Promise<PaginatedResult<Workspace>> {
    const params: any = {};
    if (options?.pagination) {
      params.limit = options.pagination.limit;
      params.offset = options.pagination.offset;
    }
    if (options?.sort && options.sort.length > 0) {
      const sortOpt = options.sort[0];
      if (sortOpt) {
        params.sort_by = sortOpt.field;
        params.sort_dir = sortOpt.direction;
      }
    }

    const response = await this.apiClient.get<any>('/api/v1/proxy/workspaces', params);

    let items = [];
    let pagination = { limit: 100, offset: 0, total: 0, has_more: false };

    // Handle nested structure from backend { data: { data: [], pagination: {} } }
    if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.data)) {
      items = response.data.data;
      if (response.data.pagination) pagination = response.data.pagination;
    } else if (Array.isArray(response.data)) {
      items = response.data;
      if (response.pagination) pagination = response.pagination;
    } else if (response.data && Array.isArray(response.data.items)) {
      // Fallback for other potential structures
      items = response.data.items;
      if (response.data.pagination) pagination = response.data.pagination;
    }

    return {
      data: items.map((item: any) => Workspace.create(item)),
      pagination: pagination as any,
    };
  }

  async getById(id: string): Promise<Workspace | null> {
    const response = await this.apiClient.get<any>(`/api/v1/proxy/workspaces/${id}`);
    return response ? Workspace.create(response.data) : null;
  }

  async create(data: CreateNewWorkspaceRequest): Promise<Workspace> {
    const response = await this.apiClient.post<any>('/api/v1/proxy/workspaces', data);
    return Workspace.create(response.data);
  }

  async update(id: string, data: UpdateWorkspaceRequest): Promise<void> {
    await this.apiClient.put(`/api/v1/proxy/workspaces/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/proxy/workspaces/${id}/soft-delete`);
  }

  async count(): Promise<number> {
    const response = await this.apiClient.get<{ count: number }>('/api/v1/proxy/workspaces/count');
    return response.count;
  }

  async softDeleteMany(ids: string[]): Promise<void> {
    const params = new URLSearchParams();
    ids.forEach((id) => params.append('ids', id));
    await this.apiClient.delete(`/api/v1/proxy/workspaces/soft-delete-many?${params.toString()}`);
  }

  async transferMany(data: BatchTransfer): Promise<void> {
    throw new Error('Transfer many not implemented for workspaces');
  }
}
