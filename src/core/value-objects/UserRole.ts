export type UserRoleValue = 'admin' | 'pathologist' | 'datascientist' | 'unassigned';

/** Groups an admin can put a user in. */
export const ASSIGNABLE_ROLES: readonly UserRoleValue[] = ['admin', 'pathologist', 'datascientist'];

// Names stored before the user groups existed. auth-service maps them too; this
// covers a backend that is one deploy behind the frontend.
const LEGACY_ROLES: Record<string, UserRoleValue> = {
  user: 'pathologist',
  viewer: 'datascientist',
};

export class UserRole {
  private static readonly VALID_VALUES: readonly UserRoleValue[] = [
    ...ASSIGNABLE_ROLES,
    'unassigned',
  ];

  private constructor(private readonly value: UserRoleValue) {}

  /**
   * Never throws: a role this build does not know (a group added later, served
   * to a cached bundle) becomes "unassigned" — no access — instead of breaking login.
   */
  static fromString(value: string): UserRole {
    const name = String(value ?? '')
      .trim()
      .toLowerCase();
    const known = UserRole.VALID_VALUES.find((v) => v === name);
    return new UserRole(known ?? LEGACY_ROLES[name] ?? 'unassigned');
  }

  static admin(): UserRole {
    return new UserRole('admin');
  }

  static pathologist(): UserRole {
    return new UserRole('pathologist');
  }

  static datascientist(): UserRole {
    return new UserRole('datascientist');
  }

  toString(): UserRoleValue {
    return this.value;
  }

  equals(other: UserRole): boolean {
    return this.value === other.value;
  }

  isAdmin(): boolean {
    return this.value === 'admin';
  }

  canManageUsers(): boolean {
    return this.isAdmin();
  }

  public toDisplayString(): string {
    switch (this.value) {
      case 'admin':
        return 'Yönetici';
      case 'pathologist':
        return 'Patolog';
      case 'datascientist':
        return 'Veri Bilimci';
      case 'unassigned':
      default:
        return 'Atanmamış';
    }
  }

  public toCssClass(): string {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (this.value) {
      case 'admin':
        return `${base} bg-purple-100 text-purple-800`;
      case 'pathologist':
        return `${base} bg-blue-100 text-blue-800`;
      case 'datascientist':
        return `${base} bg-indigo-100 text-indigo-800`;
      case 'unassigned':
      default:
        return `${base} bg-gray-100 text-gray-800`;
    }
  }
}
