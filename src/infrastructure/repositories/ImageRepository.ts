import type {
  ImageUploadPayload,
  CreateNewImageRequest,
  UploadImageParams,
  IImageRepository,
  OnUploadProgress,
} from '@/core/repositories/IImageRepository';
import type { PaginatedResult, Pagination } from '@/core/types/common';

import { ApiClient } from '../api/ApiClient';
import { Image } from '@/core/entities/Image';
import axios, { type AxiosProgressEvent } from 'axios';
import type { BatchTransfer } from '@/core/repositories/common';

// BackendUploadResponse -> { "data": ImageUploadPayload, ... }
interface BackendUploadResponse {
  data: ImageUploadPayload & { message: string };
  [key: string]: any;
}

// ImageDataResponse -> { "data": ImageResponse }
interface BackendImageResponse {
  data: any; // Backend'den gelen ham resim verisi
  [key: string]: any;
}

// ImageListResponse -> { "data": [ImageResponse], "pagination": ... }
interface BackendImageListResponse {
  data: any[];
  pagination: Pagination;
  [key: string]: any;
}

export class ImageRepository implements IImageRepository {
  constructor(private apiClient: ApiClient) {}

  async create(data: CreateNewImageRequest): Promise<ImageUploadPayload> {
    const response = await this.apiClient.post<BackendUploadResponse>('/api/v1/proxy/images', data);
    return response.data;
  }

  async upload(params: UploadImageParams): Promise<void> {
    const { payload, file, onUploadProgress } = params;

    await axios.put(payload.upload_url, file, {
      headers: {
        ...payload.headers,
        'Content-Type': file.type,
      },

      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded / progressEvent.total) * 100);

          onUploadProgress(percentage);
        }
      },
    });
  }

  async getById(imageId: string): Promise<Image> {
    const response = await this.apiClient.get<BackendImageResponse>(
      `/api/v1/proxy/images/${imageId}`
    );

    return Image.create(response.data);
  }

  async delete(imageId: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/proxy/images/${imageId}`);
  }

  async getByPatientId(patientId: string, pagination: Pagination): Promise<PaginatedResult<Image>> {
    const response = await this.apiClient.get<BackendImageListResponse>(
      `/api/v1/proxy/patients/${patientId}/images`,
      {
        params: pagination,
      }
    );
    return {
      data: response.data.map(Image.create),
      pagination: response.pagination,
    };
  }

  async transfer(imageId: string, newPatientId: string): Promise<void> {
    await this.apiClient.put(`/api/v1/proxy/images/${imageId}/transfer/${newPatientId}`, {});
  }

  async batchTransfer(data: BatchTransfer): Promise<void> {
    await this.apiClient.put(`/api/v1/proxy/images/batch-transfer`, data);
  }

  async count(): Promise<number> {
    const response = await this.apiClient.get<{ count: number }>(`/api/v1/proxy/images/count-v1`);
    return response.count;
  }

  async batchDelete(ids: string[]): Promise<void> {
    await this.apiClient.post(`/api/v1/proxy/images/batch-delete`, { ids });
  }
}
