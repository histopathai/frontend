export class UserRole {
  private static readonly VALID_VALUES = ['admin', 'user', 'viewer', 'unassigned'] as const;
  private readonly value: typeof UserRole.VALID_VALUES[number];

  private constructor(value: string) {
    if (!UserRole.VALID_VALUES.includes(value as any)) {
      throw new Error(`Invalid user role: ${value}`);
    }
    this.value = value as typeof UserRole.VALID_VALUES[number];
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
}