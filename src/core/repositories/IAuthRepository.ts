import type { User } from '@/core/entities/User';
import type { Session } from '@/core/entities/Session';

export interface BackendRegisterRequest {
  email: string;
  token: string;
  display_name: string;
}

export interface ChangePasswordRequest {
  new_password: string;
}

export interface BackendUserResponse {
  user?: any;
  [key: string]: any;
}

export interface BackendSessionResponse {
  session: any;
}

export interface BackendSessionListResponse {
  data: any[];
}

export interface VerifyTokenResponse {
  valid: boolean;
  user: any;
}

export interface IAuthRepository {
  register(data: BackendRegisterRequest): Promise<User>;
  login(token: string): Promise<Session>;
  checkSession(): Promise<Session | null>;
  logout(): Promise<void>;
  getProfile(): Promise<User>;
  listMySessions(): Promise<Session[]>;
  revokeSession(sessionId: string): Promise<void>;
  changePassword(data: ChangePasswordRequest): Promise<void>;
  deleteAccount(): Promise<void>;
}
