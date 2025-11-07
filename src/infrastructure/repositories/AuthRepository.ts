import { User } from '@/core/entities/User';
import { Session } from '@/core/entities/Session';
import type { RegisterRequest, IAuthRepository } from '@/core/repositories/IAuthRepository';
import type { ApiClient } from '../api/ApiClient'; // Varsayılan

// Backend DTO'larını modellemek için
interface BackendUserResponse {
  data: any;
  [key: string]: any;
}

interface BackendSessionResponse {
  data: any;
  [key: string]: any;
}

interface BackendSessionListResponse {
  data: any[];
  [key: string]: any;
}

export class AuthRepository implements IAuthRepository {
  constructor(private apiClient: ApiClient) {}

  async register(data: RegisterRequest): Promise<User> {
    const response = await this.apiClient.post<BackendUserResponse>('/api/v1/auth/register', data);
    return User.create(response.data.user);
  }

  async login(token: string): Promise<Session> {
    const response = await this.apiClient.post<BackendSessionResponse>('/api/v1/sessions', {
      token,
    });
    return Session.create(response.data.session);
  }

  async getProfile(): Promise<User> {
    const response = await this.apiClient.get<BackendUserResponse>('/api/v1/user/profile');
    return User.create(response.data);
  }

  async listMySessions(): Promise<Session[]> {
    const response = await this.apiClient.get<BackendSessionListResponse>('/api/v1/sessions');
    return response.data.map((item: any) => Session.create(item));
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/sessions/${sessionId}`);
  }
}
