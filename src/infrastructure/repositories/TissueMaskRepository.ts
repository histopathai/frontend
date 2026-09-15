import type { TissueMask } from '@/core/entities/TissueMask';
import { tissueMaskFromApi } from '@/core/entities/TissueMask';
import type {
  ITissueMaskRepository,
  SaveTissueMaskRequest,
} from '@/core/repositories/ITissueMaskRepository';
import { ApiClient } from '../api/ApiClient';

export class TissueMaskRepository implements ITissueMaskRepository {
  constructor(private apiClient: ApiClient) {}

  async getByImage(imageId: string): Promise<TissueMask | null> {
    try {
      const response = await this.apiClient.get<any>(`/api/v1/proxy/tissue-masks/image/${imageId}`);
      return tissueMaskFromApi(response.data);
    } catch (e: any) {
      if (e?.status === 404) return null;
      throw e;
    }
  }

  async save(imageId: string, data: SaveTissueMaskRequest): Promise<TissueMask> {
    const response = await this.apiClient.put<any>(
      `/api/v1/proxy/tissue-masks/image/${imageId}`,
      data
    );
    return tissueMaskFromApi(response.data);
  }

  async approve(imageId: string): Promise<TissueMask> {
    const response = await this.apiClient.post<any>(
      `/api/v1/proxy/tissue-masks/image/${imageId}/approve`
    );
    return tissueMaskFromApi(response.data);
  }

  async getPreview(imageId: string): Promise<Blob | null> {
    try {
      return await this.apiClient.getBlob(`/api/v1/proxy/${imageId}/tissue_preview.png`);
    } catch (e: any) {
      // The tile proxy answers a missing preview with 500 and a not-found message.
      if (e?.status === 404 || e?.status >= 500) return null;
      throw e;
    }
  }
}
