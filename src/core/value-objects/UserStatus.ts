export class UserStatus {
  private static readonly VALID_VALUES = ['pending', 'active', 'suspended'] as const;
  private readonly value: (typeof UserStatus.VALID_VALUES)[number];

  private constructor(value: string) {
    if (!UserStatus.VALID_VALUES.includes(value as any)) {
      if (value === 'deactivated') {
        this.value = 'suspended';
      } else {
        throw new Error(`Invalid UserStatus value: ${value}`);
      }
    } else {
      this.value = value as (typeof UserStatus.VALID_VALUES)[number];
    }
  }

  static fromString(value: string): UserStatus {
    return new UserStatus(value);
  }

  static pending(): UserStatus {
    return new UserStatus('pending');
  }

  static active(): UserStatus {
    return new UserStatus('active');
  }

  static suspended(): UserStatus {
    return new UserStatus('suspended');
  }

  toString(): string {
    return this.value;
  }

  equals(other: UserStatus): boolean {
    return this.value === other.value;
  }

  isPending(): boolean {
    return this.value === 'pending';
  }

  isActive(): boolean {
    return this.value === 'active';
  }

  isSuspended(): boolean {
    return this.value === 'suspended';
  }
  public toDisplayString(): string {
    switch (this.value) {
      case 'pending':
        return 'Onay Bekliyor';
      case 'active':
        return 'Aktif';
      case 'suspended':
        return 'Askıya Alınmış';
      default:
        return 'Bilinmiyor';
    }
  }
  public toCssClass(): string {
    switch (this.value) {
      case 'active':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
      case 'pending':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
      default:
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
    }
  }
}
