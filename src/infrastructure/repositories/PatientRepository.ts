import type {
  CreateNewPatientRequest,
  IPatientRepository,
} from '@/core/repositories/IPatientRepository';
import type { PaginatedResult, Pagination } from '@/core/types/common';

import { Patient } from '@/core/entities/Patient';
import { ApiClient } from '../api/ApiClient';

export class PatientRepository implements IPatientRepository {
  constructor(private apiClient: ApiClient) {}

  async getById(id: string): Promise<Patient | null> {
    const response = await this.apiClient.get<any>(`/api/v1/proxy/patients/${id}`);
    return response ? Patient.create(response) : null;
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
    return Patient.create(response);
  }

  async update(id: string, data: Partial<CreateNewPatientRequest>): Promise<void> {
    await this.apiClient.put(`/api/v1/proxy/patients/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/proxy/patients/${id}`);
  }

  async transfer(id: string, newWorkspaceId: string): Promise<void> {
    await this.apiClient.post(`/api/v1/proxy/patients/${id}/transfer`, {
      newWorkspaceId,
    });
  }
}
