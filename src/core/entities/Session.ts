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
      userId: data.user_id,
      createdAt: typeof data.created_at === 'string' ? new Date(data.created_at) : data.created_at,
      expiresAt: typeof data.expires_at === 'string' ? new Date(data.expires_at) : data.expires_at,
      lastUsedAt:
        typeof data.last_used_at === 'string' ? new Date(data.last_used_at) : data.last_used_at,
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
