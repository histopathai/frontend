import type {
  CreateNewPatientRequest,
  IPatientRepository,
} from '@/core/repositories/IPatientRepository';
import type { PaginatedResult, Pagination } from '@/core/types/common';

import { Patient } from '@/core/entities/Patient';
import { ApiClient } from '../api/ApiClient';
import type { BatchTransfer } from '@/core/repositories/common';

export class PatientRepository implements IPatientRepository {
  constructor(private apiClient: ApiClient) {}

  async getById(id: string): Promise<Patient | null> {
    const response = await this.apiClient.get<any>(`/api/v1/proxy/patients/${id}`);
    if (response && response.data) {
      return Patient.create(response.data);
    } else if (response && response.id) {
      return Patient.create(response);
    }

    return null;
  }

  async getByWorkspaceId(
    workspaceId: string,
    pagination: Pagination
  ): Promise<PaginatedResult<Patient>> {
    const response = await this.apiClient.get<any>(
      `/api/v1/proxy/workspaces/${workspaceId}/patients`,
      {
        limit: pagination.limit,
        offset: pagination.offset,
        sortBy: pagination.sortBy,
        sortOrder: pagination.sortOrder,
      }
    );
    return {
      data: response.data.map((item: any) => Patient.create(item)),
      pagination: response.pagination,
    };
  }

  async create(data: CreateNewPatientRequest): Promise<Patient> {
    const response = await this.apiClient.post<any>('/api/v1/proxy/patients', data);
    const patientData = response.data || response;
    return Patient.create(patientData);
  }

  async update(id: string, data: Partial<CreateNewPatientRequest>): Promise<void> {
    await this.apiClient.put(`/api/v1/proxy/patients/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/proxy/patients/${id}`);
  }

  async transfer(id: string, newWorkspaceId: string): Promise<void> {
    await this.apiClient.put(`/api/v1/proxy/patients/${id}/transfer/${newWorkspaceId}`, {});
  }
  async count(): Promise<number> {
    const response = await this.apiClient.get<{ count: number }>(`/api/v1/proxy/patients/count-v1`);
    return response.count;
  }

  async batchDelete(ids: string[]): Promise<void> {
    await this.apiClient.post(`/api/v1/proxy/patients/batch-delete`, { ids });
  }
  async batchTransfer(data: BatchTransfer): Promise<void> {
    await this.apiClient.put(`/api/v1/proxy/patients/batch-transfer`, data);
  }
  async cascadeDelete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/proxy/patients/${id}/cascade`);
  }
}
