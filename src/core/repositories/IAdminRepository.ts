import type { User } from '../entities/User';
import type { UserRole } from '../value-objects/UserRole';

export interface ApproveUserRequest {
  role: UserRole;
}

export interface IAdminRepository {
  getAllUsers(): Promise<User[]>;
  getUser(uid: string): Promise<User>;
  approveUser(uid: string, data: ApproveUserRequest): Promise<User>;
  suspendUser(uid: string): Promise<User>;
  makeAdmin(uid: string): Promise<User>;
}
