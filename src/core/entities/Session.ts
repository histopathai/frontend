export interface SessionProps {
    id: string;
    userId: string;
    createdAt: Date;
    expiresAt: Date;
    lastUsedAt: Date;
}

export class Session {
    private constructor(private props: SessionProps) {}

    static create(data: any): Session {
        return new Session({
            id: data.id,
            userId: data.userId,
            createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
            expiresAt: typeof data.expiresAt === 'string' ? new Date(data.expiresAt) : data.expiresAt,
            lastUsedAt: typeof data.lastUsedAt === 'string' ? new Date(data.lastUsedAt) : data.lastUsedAt
        });
    }

    get id(): string {
        return this.props.id;
    }

    get userId(): string {
        return this.props.userId;
    }

    get createdAt(): Date {
        return this.props.createdAt;
    }

    get expiresAt(): Date {
        return this.props.expiresAt;
    }

    get lastUsedAt(): Date {
        return this.props.lastUsedAt;
    }

    toJSON() {
        return { ...this.props };
    }
}