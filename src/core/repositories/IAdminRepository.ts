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
  deleteUser(uid: string): Promise<void>;

  /** Adds/removes the user in the readers group. This is what grants read-only
   *  access to the research data outside the platform; it does not change the
   *  platform role. */
  grantDataAccess(uid: string): Promise<User>;
  revokeDataAccess(uid: string): Promise<User>;
  /** Re-reads the group and repairs the stored flag if they have drifted. */
  refreshDataAccess(uid: string): Promise<User>;
}
