import type {
  CreateNewAnnotationRequest,
  IAnnotationRepository,
  UpdateAnnotationRequest,
  WorkspaceLabelSet,
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

    const response = await this.apiClient.get<any>(
      `/api/v1/proxy/annotations/image/${imageId}`,
      params
    );

    let items = [];
    let pagination = { limit: 100, offset: 0, total: 0, has_more: false };

    if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.data)) {
      items = response.data.data;
      if (response.data.pagination) pagination = response.data.pagination;
    } else if (Array.isArray(response.data)) {
      items = response.data;
      if (response.pagination) pagination = response.pagination;
    }

    return {
      data: items
        .map((item: any) => {
          try {
            return Annotation.create(item);
          } catch (e) {
            return null;
          }
        })
        .filter((item: Annotation | null): item is Annotation => item !== null),
      pagination: pagination as any,
    };
  }

  async listByParent(
    parentId: string,
    options?: QueryOptions
  ): Promise<PaginatedResult<Annotation>> {
    return this.listByImage(parentId, options);
  }

  async listByWorkspace(
    workspaceId: string,
    options?: QueryOptions
  ): Promise<PaginatedResult<Annotation>> {
    const params: any = {};
    if (options?.pagination) {
      params.limit = options.pagination.limit;
      params.offset = options.pagination.offset;
    }

    const response = await this.apiClient.get<any>(
      `/api/v1/proxy/annotations/workspace/${workspaceId}`,
      params
    );

    let items = [];
    let pagination = { limit: 100, offset: 0, total: 0, has_more: false };

    if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.data)) {
      items = response.data.data;
      if (response.data.pagination) pagination = response.data.pagination;
    } else if (Array.isArray(response.data)) {
      items = response.data;
      if (response.pagination) pagination = response.pagination;
    }

    return {
      data: items
        .map((item: any) => {
          try {
            return Annotation.create(item);
          } catch (e) {
            return null;
          }
        })
        .filter((item: Annotation | null): item is Annotation => item !== null),
      pagination: pagination as any,
    };
  }

  async labelSetsByWorkspace(workspaceId: string): Promise<WorkspaceLabelSet[] | null> {
    try {
      const response = await this.apiClient.get<any>(
        `/api/v1/proxy/annotations/workspace/${workspaceId}/label-sets`
      );
      const items: any[] = Array.isArray(response.data) ? response.data : [];
      return items.map((item) => ({
        creatorId: item.creator_id,
        annotationTypeId: item.annotation_type_id,
        resources: item.resources ?? [],
        name: item.name ?? '',
        polygonCount: item.polygon_count ?? 0,
        imageIds: item.image_ids ?? [],
      }));
    } catch (e: any) {
      // A main-service without the endpoint answers 404 (or takes "label-sets" for something else).
      if (e?.status === 404 || e?.status === 400) return null;
      throw e;
    }
  }

  async create(data: CreateNewAnnotationRequest): Promise<Annotation> {
    const response = await this.apiClient.post<any>('/api/v1/proxy/annotations', data);
    const annotationData = response.data || response;
    // Ensure workspace_id is present - backend may not return it, so merge from request
    return Annotation.create({
      ...annotationData,
      ws_id: annotationData.ws_id || annotationData.workspace_id || data.ws_id,
    });
  }

  async getById(id: string): Promise<Annotation> {
    const response = await this.apiClient.get<any>(`/api/v1/proxy/annotations/${id}?_t=${Date.now()}`);
    const annotationData = response.data || response;
    return Annotation.create(annotationData);
  }

  async update(id: string, data: UpdateAnnotationRequest): Promise<void> {
    await this.apiClient.put<any>(`/api/v1/proxy/annotations/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/proxy/annotations/${id}/soft-delete`);
  }

  async count(): Promise<number> {
    const response = await this.apiClient.get<{ count: number }>(`/api/v1/proxy/annotations/count`);
    return response.count;
  }

  async softDeleteMany(ids: string[]): Promise<void> {
    const params = new URLSearchParams();
    ids.forEach((id) => params.append('ids', id));
    await this.apiClient.delete(`/api/v1/proxy/annotations/soft-delete-many?${params.toString()}`);
  }
}
