import type {
  CreateNewAnnotationTypeRequest,
  IAnnotationType,
  UpdateAnnotationTypeRequest,
} from '@/core/repositories/IAnnotationType';
import type { PaginatedResult, Pagination } from '@/core/types/common';

import { AnnotationType } from '@/core/entities/AnnotationType';
import { ApiClient } from '../api/ApiClient';

export class AnnotationTypeRepository implements IAnnotationType {
  constructor(private apiClient: ApiClient) {}

  async list(pagination: Pagination): Promise<PaginatedResult<AnnotationType>> {
    const response = await this.apiClient.get<any>('/api/v1/proxy/annotation-types', {
      limit: pagination.limit,
      offset: pagination.offset,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });
    return {
      data: response.data.map((item: any) => AnnotationType.create(item)),
      pagination: response.pagination,
    };
  }

  async getById(id: string): Promise<AnnotationType> {
    const response = await this.apiClient.get<any>(`/api/v1/proxy/annotation-types/${id}`);
    return AnnotationType.create(response.data);
  }

  async create(data: CreateNewAnnotationTypeRequest): Promise<AnnotationType> {
    const response = await this.apiClient.post<any>('/api/v1/proxy/annotation-types', data);
    return AnnotationType.create(response.data);
  }

  async update(id: string, data: UpdateAnnotationTypeRequest): Promise<void> {
    await this.apiClient.put(`/api/v1/proxy/annotation-types/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/proxy/annotation-types/${id}`);
  }
  async batchDelete(ids: string[]): Promise<void> {
    await this.apiClient.post(`/api/v1/proxy/annotation-types/batch-delete`, { ids });
  }

  async count(): Promise<number> {
    const response = await this.apiClient.get<{ count: number }>(
      `/api/v1/proxy/annotation-types/count-v1`
    );
    return response.count;
  }
}
