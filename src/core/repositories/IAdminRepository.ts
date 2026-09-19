import type { User } from '../entities/User';
import type { PaginatedResult, Pagination } from '../types/common';
import type { UserRoleValue } from '../value-objects/UserRole';

export interface IAdminRepository {
  getAllUsers(pagination: Pagination): Promise<PaginatedResult<User>>;
  getUser(uid: string): Promise<User>;
  /** Activates a user. `role` is the group a new user joins; reactivating a
   *  suspended user takes none — they keep the role they had. */
  approveUser(uid: string, role?: 'pathologist' | 'datascientist'): Promise<User>;
  suspendUser(uid: string): Promise<User>;
  /** Moves an active user to another group. Refused for one's own account. */
  setRole(uid: string, role: Exclude<UserRoleValue, 'unassigned'>): Promise<User>;
  deleteUser(uid: string): Promise<void>;

  /** Adds/removes the user in the readers group. This is what grants read-only
   *  access to the research data outside the platform; it does not change the
   *  platform role. */
  grantDataAccess(uid: string): Promise<User>;
  revokeDataAccess(uid: string): Promise<User>;
  /** Re-reads the group and repairs the stored flag if they have drifted. */
  refreshDataAccess(uid: string): Promise<User>;
}
