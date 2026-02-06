import type {
  CreateNewPatientRequest,
  IPatientRepository,
} from '@/core/repositories/IPatientRepository';
import type { PaginatedResult, QueryOptions } from '@/core/types/common';

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

  async list(options?: QueryOptions): Promise<PaginatedResult<Patient>> {
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

    // Add search/filter params as needed
    if (options?.search) {
      params.name = options.search;
    }

    const response = await this.apiClient.get<any>('/api/v1/proxy/patients', params);

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
      data: items.map((item: any) => Patient.create(item)),
      pagination: pagination as any,
    };
  }

  async listByWorkspace(
    workspaceId: string,
    options?: QueryOptions
  ): Promise<PaginatedResult<Patient>> {
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
    if (options?.search) {
      params.name = options.search;
    }

    const response = await this.apiClient.get<any>(
      `/api/v1/proxy/workspaces/${workspaceId}/patients`,
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
      data: items.map((item: any) =>
        Patient.create({ ...item, workspace_id: item.workspace_id || workspaceId })
      ),
      pagination: pagination as any,
    };
  }

  async listByParent(parentId: string, options?: QueryOptions): Promise<PaginatedResult<Patient>> {
    return this.listByWorkspace(parentId, options);
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
    await this.apiClient.delete(`/api/v1/proxy/patients/${id}/soft-delete`);
  }

  async transfer(id: string, newWorkspaceId: string): Promise<void> {
    await this.apiClient.put(`/api/v1/proxy/patients/${id}/transfer/${newWorkspaceId}`, {});
  }

  async count(): Promise<number> {
    const response = await this.apiClient.get<{ count: number }>(`/api/v1/proxy/patients/count`);
    return response.count;
  }

  async softDeleteMany(ids: string[]): Promise<void> {
    const params = new URLSearchParams();
    ids.forEach((id) => params.append('ids', id));
    await this.apiClient.delete(`/api/v1/proxy/patients/soft-delete-many?${params.toString()}`);
  }

  async transferMany(data: BatchTransfer): Promise<void> {
    const params = new URLSearchParams();
    data.ids.forEach((id) => params.append('patient_ids', id));
    await this.apiClient.put(
      `/api/v1/proxy/patients/transfer-many/${data.target}?${params.toString()}`,
      {}
    );
  }
}
