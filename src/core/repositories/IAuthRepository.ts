import type { User } from '@/core/entities/User';
import type { Session } from '@/core/entities/Session';

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
}

export interface ChangePasswordRequest {
  new_password: string;
}

export interface IAuthRepository {
  register(data: RegisterRequest): Promise<User>;
  login(token: string): Promise<Session>;
  checkSession(): Promise<Session | null>;
  logout(): Promise<void>;
  getProfile(): Promise<User>;
  listMySessions(): Promise<Session[]>;
  revokeSession(sessionId: string): Promise<void>;
  changePassword(data: ChangePasswordRequest): Promise<void>;
  deleteAccount(): Promise<void>;
}
