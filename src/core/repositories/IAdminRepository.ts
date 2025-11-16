import type { User } from '../entities/User';
import type { PaginatedResult, Pagination } from '../types/common';
import type { UserRole } from '../value-objects/UserRole';

export interface ApproveUserRequest {
  role: UserRole;
}

export interface IAdminRepository {
  getAllUsers(pagination: Pagination): Promise<PaginatedResult<User>>;
  getUser(uid: string): Promise<User>;
  approveUser(uid: string, data: ApproveUserRequest): Promise<User>;
  suspendUser(uid: string): Promise<User>;
  makeAdmin(uid: string): Promise<User>;
}
