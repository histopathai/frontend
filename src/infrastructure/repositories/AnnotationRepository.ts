import type {
  CreateNewAnnotationRequest,
  IAnnotationRepository,
} from '@/core/repositories/IAnnotation';
import type { PaginatedResult, QueryOptions } from '@/core/types/common';

import { Annotation } from '@/core/entities/Annotation';
import { ApiClient } from '../api/ApiClient';

export class AnnotationRepository implements IAnnotationRepository {
  constructor(private apiClient: ApiClient) {}

  async listByImage(imageId: string, options?: QueryOptions): Promise<PaginatedResult<Annotation>> {
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
    params.populate = ['tag'];

    const response = await this.apiClient.get<any>(
      `/api/v1/proxy/annotations/image/${imageId}`,
      params
    );

    let items = [];
    let pagination = { limit: 10, offset: 0, total: 0, has_more: false };

    if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.data)) {
      items = response.data.data;
      if (response.data.pagination) pagination = response.data.pagination;
    } else if (Array.isArray(response.data)) {
      items = response.data;
      if (response.pagination) pagination = response.pagination;
    }

    return {
      data: items.map((item: any) => Annotation.create(item)),
      pagination: pagination as any,
    };
  }

  async create(data: CreateNewAnnotationRequest): Promise<Annotation> {
    const response = await this.apiClient.post<any>('/api/v1/proxy/annotations', data);
    const annotationData = response.data || response;
    return Annotation.create(annotationData);
  }

  async getById(id: string): Promise<Annotation> {
    const response = await this.apiClient.get<any>(`/api/v1/proxy/annotations/${id}`);
    const annotationData = response.data || response;
    return Annotation.create(annotationData);
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
