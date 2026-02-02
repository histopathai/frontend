import type {
  CreateNewAnnotationTypeRequest,
  IAnnotationTypeRepository,
  UpdateAnnotationTypeRequest,
} from '@/core/repositories/IAnnotationType';
import type { PaginatedResult, QueryOptions } from '@/core/types/common';

import { AnnotationType } from '@/core/entities/AnnotationType';
import { ApiClient } from '../api/ApiClient';

export class AnnotationTypeRepository implements IAnnotationTypeRepository {
  constructor(private apiClient: ApiClient) {}

  async list(options?: QueryOptions): Promise<PaginatedResult<AnnotationType>> {
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

    const response = await this.apiClient.get<any>('/api/v1/proxy/annotation-types', params);

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
      data: items.map((item: any) => AnnotationType.create(item)),
      pagination: pagination as any,
    };
  }

  async listByParent(
    parentId: string,
    options?: QueryOptions
  ): Promise<PaginatedResult<AnnotationType>> {
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
    params.parent_id = parentId;

    const response = await this.apiClient.get<any>('/api/v1/proxy/annotation-types', params);

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
      data: items.map((item: any) => AnnotationType.create(item)),
      pagination: pagination as any,
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
