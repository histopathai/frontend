import { User } from '../entities/User';
import { Session } from '../entities/Session';

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  token: string;
}

export interface IAuthRepository {
  register(request: RegisterRequest): Promise<User>;
  login(token: string): Promise<Session>;
  getProfile(): Promise<User>;
  listMySessions(): Promise<Session[]>;
  revokeSession(sessionId: string): Promise<void>;
}
