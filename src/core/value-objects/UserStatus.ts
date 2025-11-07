export class UserStatus {
    private static readonly VALID_VALUES = ['pending', 'active', 'suspended'] as const;
    private readonly value: typeof UserStatus.VALID_VALUES[number];

    private constructor(value: string) {
        if (!UserStatus.VALID_VALUES.includes(value as any)) {
            throw new Error(`Invalid UserStatus value: ${value}`);
        }
        this.value = value as typeof UserStatus.VALID_VALUES[number];
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
}

