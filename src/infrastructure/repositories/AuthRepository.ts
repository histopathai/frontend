import type {
  RegisterRequest,
  IAuthRepository,
  ChangePasswordRequest,
} from '@/core/repositories/IAuthRepository';
import type { ApiClient } from '../api/ApiClient';

import { User } from '@/core/entities/User';
import { Session } from '@/core/entities/Session';

interface BackendUserResponse {
  user?: any;
  [key: string]: any;
}

interface BackendSessionResponse {
  session: any;
}

interface BackendSessionListResponse {
  data: any[];
}

interface VerifyTokenResponse {
  valid: boolean;
  user: any;
}

export class AuthRepository implements IAuthRepository {
  private readonly SESSION_COOKIE_NAME = 'session_id';

  constructor(private apiClient: ApiClient) {}

  async register(data: RegisterRequest): Promise<User> {
    const response = await this.apiClient.post<BackendUserResponse>('/api/v1/auth/register', data);
    return User.create(response.user);
  }

  async login(token: string): Promise<Session> {
    try {
      const verifyResponse = await this.apiClient.post<VerifyTokenResponse>('/api/v1/auth/verify', {
        token,
      });

      if (!verifyResponse.valid) {
        throw new Error('Invalid token');
      }

      await this.apiClient.put('/api/v1/sessions', {
        token,
      });
      const session = await this.checkSession();

      if (!session) {
        throw new Error('Failed to retrieve session after cookie was set');
      }
      return session;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async checkSession(): Promise<Session | null> {
    try {
      const response = await this.apiClient.get<BackendSessionResponse>('/api/v1/sessions/current');
      console.log('Session check response:', response);
      if (response?.session) {
        return Session.create(response.session);
      }

      return null;
    } catch (error) {
      console.log('No active session');
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.apiClient.post('/api/v1/sessions/revoke');
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async getProfile(): Promise<User> {
    const response = await this.apiClient.get<BackendUserResponse>('/api/v1/user/profile');
    console.log('Profile response:', response);
    return User.create(response.user);
  }

  async listMySessions(): Promise<Session[]> {
    const response = await this.apiClient.get<BackendSessionListResponse>('/api/v1/sessions');
    return response.data.map((item: any) => Session.create(item));
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/sessions/${sessionId}`);
  }

  async changePassword(payload: ChangePasswordRequest): Promise<void> {
    await this.apiClient.put<void>('/api/v1/auth/password', payload);
  }
  async deleteAccount(): Promise<void> {
    await this.apiClient.delete('/api/v1/user/account');
  }
}
