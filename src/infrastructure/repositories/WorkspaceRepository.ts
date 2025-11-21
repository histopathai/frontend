import type {
  IWorkspaceRepository,
  CreateNewWorkspaceRequest,
  UpdateWorkspaceRequest,
} from '@/core/repositories/IWorkspaceRepository';
import type { PaginatedResult, Pagination } from '@/core/types/common';

import { Workspace } from '@/core/entities/Workspace';
import { ApiClient } from '../api/ApiClient';

export class WorkspaceRepository implements IWorkspaceRepository {
  constructor(private apiClient: ApiClient) {}

  async list(pagination: Pagination): Promise<PaginatedResult<Workspace>> {
    const response = await this.apiClient.get<any>('/api/v1/proxy/workspaces', {
      limit: pagination.limit,
      offset: pagination.offset,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });
    return {
      data: response.data.map((item: any) => Workspace.create(item)),
      pagination: response.pagination,
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
    await this.apiClient.delete(`/api/v1/proxy/workspaces/${id}`);
  }
}
