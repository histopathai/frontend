import type { ApiClient } from '../api/ApiClient';
import type { IAdminRepository, ApproveUserRequest } from '@/core/repositories/IAdminRepository';
import { User } from '@/core/entities/User';

export class AdminRepository implements IAdminRepository {
  constructor(private apiClient: ApiClient) {}

  async getAllUsers(): Promise<User[]> {
    const response = await this.apiClient.get<{ users: any[] }>('/api/v1/admin/users');
    return response.users.map(User.create);
  }

  async getUser(uid: string): Promise<User> {
    const response = await this.apiClient.get<{ user: any }>(`/api/v1/admin/users/${uid}`);
    return User.create(response.user);
  }

  async approveUser(uid: string, data: ApproveUserRequest): Promise<User> {
    const response = await this.apiClient.put<{ user: any }>(`/api/v1/admin/users/${uid}/approve`, {
      role: data.role.toString(),
    });
    return User.create(response.user);
  }

  async suspendUser(uid: string): Promise<User> {
    const response = await this.apiClient.put<{ user: any }>(
      `/api/v1/admin/users/${uid}/suspend`,
      {}
    );
    return User.create(response.user);
  }

  async makeAdmin(uid: string): Promise<User> {
    const response = await this.apiClient.put<{ user: any }>(
      `/api/v1/admin/users/${uid}/admin`,
      {}
    );
    return User.create(response.user);
  }
}
