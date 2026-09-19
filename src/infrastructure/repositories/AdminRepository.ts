import type { ApiClient } from '../api/ApiClient';
import type { IAdminRepository } from '@/core/repositories/IAdminRepository';
import type { PaginatedResult, Pagination } from '@/core/types/common';
import type { UserRoleValue } from '@/core/value-objects/UserRole';

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

  async approveUser(uid: string, role?: 'pathologist' | 'datascientist'): Promise<User> {
    const response = await this.apiClient.post<{ user: any }>(
      `/api/v1/admin/users/${uid}/approve`,
      role ? { role } : undefined
    );
    const userData = response.user || response;
    return User.create(userData);
  }

  async suspendUser(uid: string): Promise<User> {
    const response = await this.apiClient.post<{ user: any }>(`/api/v1/admin/users/${uid}/suspend`);
    const userData = response.user || response;
    return User.create(userData);
  }

  async setRole(uid: string, role: Exclude<UserRoleValue, 'unassigned'>): Promise<User> {
    const response = await this.apiClient.put<{ user: any }>(`/api/v1/admin/users/${uid}/role`, {
      role,
    });
    const userData = response.user || response;
    return User.create(userData);
  }

  async deleteUser(uid: string): Promise<void> {
    await this.apiClient.delete<void>(`/api/v1/admin/users/${uid}`);
  }

  async grantDataAccess(uid: string): Promise<User> {
    const response = await this.apiClient.post<{ user: any }>(
      `/api/v1/admin/users/${uid}/data-access`
    );
    return User.create(response.user || response);
  }

  async revokeDataAccess(uid: string): Promise<User> {
    const response = await this.apiClient.delete<{ user: any }>(
      `/api/v1/admin/users/${uid}/data-access`
    );
    return User.create(response.user || response);
  }

  async refreshDataAccess(uid: string): Promise<User> {
    const response = await this.apiClient.get<{ user: any }>(
      `/api/v1/admin/users/${uid}/data-access`
    );
    return User.create(response.user || response);
  }
}
