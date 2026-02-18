import type {
  ImageUploadPayload,
  CreateNewImageRequest,
  UploadImageParams,
  IImageRepository,
} from '@/core/repositories/IImageRepository';
import type { PaginatedResult, QueryOptions, Pagination } from '@/core/types/common';

import { ApiClient } from '../api/ApiClient';
import { Image } from '@/core/entities/Image';
import axios, { type AxiosProgressEvent } from 'axios';
import type { BatchTransfer } from '@/core/repositories/common';

interface BackendUploadResponse {
  data: ImageUploadPayload[];
  [key: string]: any;
}

interface BackendImageResponse {
  data: any;
  [key: string]: any;
}

interface BackendImageListResponse {
  data: any[];
  pagination: Pagination;
  [key: string]: any;
}

export class ImageRepository implements IImageRepository {
  constructor(private apiClient: ApiClient) {}

  async create(data: CreateNewImageRequest): Promise<ImageUploadPayload[]> {
    const response = await this.apiClient.post<BackendUploadResponse>('/api/v1/proxy/images', data);
    return response.data;
  }

  async upload(params: UploadImageParams): Promise<void> {
    const { payload, file, contentType, onUploadProgress } = params;
    const finalContentType = contentType || file.type;
    try {
      await axios.put(payload.upload_url, file, {
        headers: {
          ...payload.headers,
          'Content-Type': finalContentType,
        },

        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (onUploadProgress && progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            onUploadProgress(percentage);
          }
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async getById(imageId: string): Promise<Image> {
    const response = await this.apiClient.get<BackendImageResponse>(
      `/api/v1/proxy/images/${imageId}`
    );

    return Image.create(response.data);
  }

  async delete(imageId: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/proxy/images/${imageId}/soft-delete`);
  }

  async list(options?: QueryOptions): Promise<PaginatedResult<Image>> {
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
    const response = await this.apiClient.get<BackendImageListResponse>(
      '/api/v1/proxy/images',
      params
    );

    let items = [];
    let pagination = { limit: 10, offset: 0, total: 0, has_more: false };

    // Cast response to any to handle flexible structure
    const respAny = response as any;

    if (respAny.data && !Array.isArray(respAny.data) && Array.isArray(respAny.data.data)) {
      items = respAny.data.data;
      if (respAny.data.pagination) pagination = respAny.data.pagination;
    } else if (Array.isArray(respAny.data)) {
      items = respAny.data;
      if (respAny.pagination) pagination = respAny.pagination;
    }

    return {
      data: items.map(Image.create),
      pagination: pagination as any,
    };
  }

  async listByPatient(patientId: string, options?: QueryOptions): Promise<PaginatedResult<Image>> {
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

    const response = await this.apiClient.get<BackendImageListResponse>(
      `/api/v1/proxy/patients/${patientId}/images`,
      params
    );

    let items = [];
    let pagination = { limit: 10, offset: 0, total: 0, has_more: false };
    const respAny = response as any;

    if (respAny.data && !Array.isArray(respAny.data) && Array.isArray(respAny.data.data)) {
      items = respAny.data.data;
      if (respAny.data.pagination) pagination = respAny.data.pagination;
    } else if (Array.isArray(respAny.data)) {
      items = respAny.data;
      if (respAny.pagination) pagination = respAny.pagination;
    }

    return {
      data: items.map(Image.create),
      pagination: pagination as any,
    };
  }

  async listByParent(parentId: string, options?: QueryOptions): Promise<PaginatedResult<Image>> {
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

    const response = await this.apiClient.get<any>(
      `/api/v1/proxy/images/parent/${parentId}`,
      params
    );

    let items = [];
    let pagination = { limit: 10, offset: 0, total: 0, has_more: false };
    const respAny = response as any;

    if (respAny.data && !Array.isArray(respAny.data) && Array.isArray(respAny.data.data)) {
      items = respAny.data.data;
      if (respAny.data.pagination) pagination = respAny.data.pagination;
    } else if (Array.isArray(respAny.data)) {
      items = respAny.data;
      if (respAny.pagination) pagination = respAny.pagination;
    }

    return {
      data: items.map(Image.create),
      pagination: pagination as any,
    };
  }

  async listByWorkspace(
    workspaceId: string,
    options?: QueryOptions
  ): Promise<PaginatedResult<Image>> {
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

    const response = await this.apiClient.get<any>(
      `/api/v1/proxy/images/workspace/${workspaceId}`,
      params
    );

    let items = [];
    let pagination = { limit: 10, offset: 0, total: 0, has_more: false };
    const respAny = response as any;

    if (respAny.data && !Array.isArray(respAny.data) && Array.isArray(respAny.data.data)) {
      items = respAny.data.data;
      if (respAny.data.pagination) pagination = respAny.data.pagination;
    } else if (Array.isArray(respAny.data)) {
      items = respAny.data;
      if (respAny.pagination) pagination = respAny.pagination;
    }

    return {
      data: items.map(Image.create),
      pagination: pagination as any,
    };
  }

  async transfer(imageId: string, newPatientId: string): Promise<void> {
    await this.apiClient.put(`/api/v1/proxy/images/${imageId}/transfer/${newPatientId}`, {});
  }

  async transferMany(data: BatchTransfer): Promise<void> {
    const params = new URLSearchParams();
    data.ids.forEach((id) => params.append('ids', id));
    await this.apiClient.put(
      `/api/v1/proxy/images/transfer-many/${data.target}?${params.toString()}`,
      {}
    );
  }

  async count(): Promise<number> {
    const response = await this.apiClient.get<{ count: number }>(`/api/v1/proxy/images/count`);
    return response.count;
  }

  async softDeleteMany(ids: string[]): Promise<void> {
    const params = new URLSearchParams();
    ids.forEach((id) => params.append('ids', id));
    await this.apiClient.delete(`/api/v1/proxy/images/soft-delete-many?${params.toString()}`);
  }
}
