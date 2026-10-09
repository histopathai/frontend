import {
  recheckFromApi,
  type RecheckReasonCode,
  type RecheckRequest,
  type RecheckStatus,
} from '@/core/recheck';
import { ApiClient } from '../api/ApiClient';

const BASE = '/api/v1/proxy/recheck-requests';

export class RecheckRepository {
  constructor(private apiClient: ApiClient) {}

  /** Every request, or those with the given status. */
  async list(status?: RecheckStatus): Promise<RecheckRequest[]> {
    const response = await this.apiClient.get<any>(BASE, status ? { status } : undefined);
    return (response.data ?? []).map(recheckFromApi);
  }

  /** Admins: adds the reason to the image's request (made or reopened as needed). */
  async request(imageId: string, reason: RecheckReasonCode, note: string): Promise<RecheckRequest> {
    const response = await this.apiClient.post<any>(`${BASE}/${imageId}/reasons`, { reason, note });
    return recheckFromApi(response.data);
  }

  async setDone(imageId: string, done: boolean): Promise<RecheckRequest> {
    const response = await this.apiClient.put<any>(`${BASE}/${imageId}/status`, { done });
    return recheckFromApi(response.data);
  }

  /** Admins: sends every image of the workspace with the note; returns how many. */
  async requestWorkspace(wsId: string, note: string): Promise<number> {
    const response = await this.apiClient.post<any>(`/api/v1/proxy/recheck-workspaces/${wsId}`, { note });
    return response.data?.images ?? 0;
  }

  /** Admins: takes the workspace's "dataset" reason off; images sent on their own stay. */
  async withdrawWorkspace(wsId: string): Promise<number> {
    const response = await this.apiClient.delete<any>(`/api/v1/proxy/recheck-workspaces/${wsId}`);
    return response?.data?.images ?? 0;
  }

  /** Admins: takes the image out of Ek Kontrol; its annotations are not touched. */
  async cancel(imageId: string): Promise<void> {
    await this.apiClient.delete(`${BASE}/${imageId}`);
  }
}
