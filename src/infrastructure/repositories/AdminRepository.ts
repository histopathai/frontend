import type { ApiClient } from '../api/ApiClient';
import type { IAdminRepository, ApproveUserRequest } from '@/core/repositories/IAdminRepository';
import type { PaginatedResult, Pagination } from '@/core/types/common';

import { User } from '@/core/entities/User';
import type { deleteUser } from 'firebase/auth';

export class AdminRepository implements IAdminRepository {
  constructor(private apiClient: ApiClient) {}

  async getAllUsers(pagination: Pagination): Promise<PaginatedResult<User>> {
    const response = await this.apiClient.get<any>('/api/v1/admin/users', {
      limit: pagination.limit,
      offset: pagination.offset,
      sort_by: pagination.sortBy,
      sort_dir: pagination.sortDir,
    });

    return {
      data: response.data.map((item: any) => User.create(item)),
      pagination: response.pagination,
    };
  }

  async getUser(uid: string): Promise<User> {
    const response = await this.apiClient.get<{ user: any }>(`/api/v1/admin/users/${uid}`);
    const userData = response.user || response;
    return User.create(userData);
  }

  async approveUser(uid: string, data: ApproveUserRequest): Promise<User> {
    const response = await this.apiClient.post<{ user: any }>(
      `/api/v1/admin/users/${uid}/approve`,
      {
        role: data.role.toString(),
      }
    );
    const userData = response.user || response;
    return User.create(userData);
  }

  async suspendUser(uid: string): Promise<User> {
    const response = await this.apiClient.post<{ user: any }>(`/api/v1/admin/users/${uid}/suspend`);
    const userData = response.user || response;
    return User.create(userData);
  }

  async makeAdmin(uid: string): Promise<User> {
    const response = await this.apiClient.post<{ user: any }>(
      `/api/v1/admin/users/${uid}/make-admin`
    );
    const userData = response.user || response;
    return User.create(userData);
  }

  async deleteUser(uid: string): Promise<void> {
    await this.apiClient.delete<void>(`/api/v1/admin/users/${uid}`);
  }
}
