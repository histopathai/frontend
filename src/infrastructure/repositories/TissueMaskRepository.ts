import type { TissueMask } from '@/core/entities/TissueMask';
import { tissueMaskFromApi } from '@/core/entities/TissueMask';
import type {
  ITissueMaskRepository,
  SaveTissueMaskRequest,
  TissueMaskSummary,
  TissueMaskWorkspaceStats,
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

  async approve(imageId: string, expectedRevision?: number): Promise<TissueMask> {
    const response = await this.apiClient.post<any>(
      `/api/v1/proxy/tissue-masks/image/${imageId}/approve`,
      { expected_revision: expectedRevision }
    );
    return tissueMaskFromApi(response.data);
  }

  async reject(
    imageId: string,
    reason: string | null,
    expectedRevision?: number
  ): Promise<TissueMask> {
    const response = await this.apiClient.post<any>(
      `/api/v1/proxy/tissue-masks/image/${imageId}/reject`,
      { reason, expected_revision: expectedRevision }
    );
    return tissueMaskFromApi(response.data);
  }

  async listByWorkspace(workspaceId: string): Promise<TissueMaskSummary[]> {
    const limit = 100;
    const summaries: TissueMaskSummary[] = [];
    for (let offset = 0; ; offset += limit) {
      const response = await this.apiClient.get<any>(
        `/api/v1/proxy/tissue-masks/workspace/${workspaceId}`,
        { limit, offset }
      );
      const items: any[] = Array.isArray(response.data) ? response.data : [];
      for (const item of items) summaries.push({ imageId: item.image_id, status: item.status });
      const hasMore = response.pagination?.has_more ?? items.length === limit;
      if (!hasMore || items.length === 0) return summaries;
    }
  }

  async getWorkspaceStats(): Promise<TissueMaskWorkspaceStats[]> {
    const response = await this.apiClient.get<any>('/api/v1/proxy/tissue-masks/workspace-stats');
    const items: any[] = Array.isArray(response.data) ? response.data : [];
    return items.map((item) => ({
      workspaceId: item.workspace_id,
      totalImages: item.total_images ?? 0,
      done: item.done ?? 0,
      remaining: item.remaining ?? 0,
    }));
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
