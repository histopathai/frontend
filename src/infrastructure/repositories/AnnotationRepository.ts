import type {
  CreateNewAnnotationRequest,
  IAnnotationRepository,
} from '@/core/repositories/IAnnotation';
import type { PaginatedResult, Pagination } from '@/core/types/common';

import { Annotation } from '@/core/entities/Annotation';
import { ApiClient } from '../api/ApiClient';

export class AnnotationRepository implements IAnnotationRepository {
  constructor(private apiClient: ApiClient) {}

  async getByImageId(
    imageId: string,
    pagination: Pagination
  ): Promise<PaginatedResult<Annotation>> {
    const response = await this.apiClient.get<any>(`/api/v1/proxy/annotations/image/${imageId}`, {
      limit: pagination.limit,
      offset: pagination.offset,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });
    return {
      data: response.data.map((item: any) => Annotation.create(item)),
      pagination: response.pagination,
    };
  }

  async create(data: CreateNewAnnotationRequest): Promise<Annotation> {
    const response = await this.apiClient.post<any>('/api/v1/proxy/annotations', data);
    return Annotation.create(response);
  }

  async getById(id: string): Promise<Annotation> {
    const response = await this.apiClient.get<any>(`/api/v1/proxy/annotations/${id}`);
    return Annotation.create(response);
  }

  async update(id: string, data: Partial<CreateNewAnnotationRequest>): Promise<void> {
    await this.apiClient.put(`/api/v1/proxy/annotations/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/proxy/annotations/${id}`);
  }

  async count(): Promise<number> {
    const response = await this.apiClient.get<{ count: number }>(
      `/api/v1/proxy/annotations/count-v1`
    );
    return response.count;
  }

  async batchDelete(ids: string[]): Promise<void> {
    await this.apiClient.post(`/api/v1/proxy/annotations/batch-delete`, { ids });
  }
}
