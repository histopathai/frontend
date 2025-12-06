export class UserRole {
  private static readonly VALID_VALUES = ['admin', 'user', 'viewer', 'unassigned'] as const;
  private readonly value: (typeof UserRole.VALID_VALUES)[number];

  private constructor(value: string) {
    if (!UserRole.VALID_VALUES.includes(value as any)) {
      throw new Error(`Invalid user role: ${value}`);
    }
    this.value = value as (typeof UserRole.VALID_VALUES)[number];
  }

  static fromString(value: string): UserRole {
    return new UserRole(value);
  }

  static admin(): UserRole {
    return new UserRole('admin');
  }

  static user(): UserRole {
    return new UserRole('user');
  }

  toString(): string {
    return this.value;
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
      case 'user':
        return 'Kullanıcı';
      case 'viewer':
        return 'İzleyici';
      case 'unassigned':
        return 'Atanmamış';
      default:
        return this.value;
    }
  }

  public toCssClass(): string {
    switch (this.value) {
      case 'admin':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800';
      case 'user':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
      case 'viewer':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800';
      case 'unassigned':
      default:
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
    }
  }
}
