export interface PatientProps {
  id: string;
  workspaceId: string;
  creatorId: string;
  name: string;
  gender: string | null;
  birthDate: Date | null;
  metadata: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export class Patient {
  private constructor(private props: PatientProps) {}

  static create(data: any): Patient {
    const {
      id,
      workspace_id,
      creator_id,
      name,
      gender,
      birth_date,
      created_at,
      updated_at,
      ...rest
    } = data;

    return new Patient({
      id,
      workspaceId: workspace_id,
      creatorId: creator_id,
      name,
      gender: gender ?? null,
      birthDate: birth_date ? new Date(birth_date) : null,
      metadata: rest || {},

      createdAt: typeof created_at === 'string' ? new Date(created_at) : created_at,
      updatedAt: typeof updated_at === 'string' ? new Date(updated_at) : updated_at,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get workspaceId(): string {
    return this.props.workspaceId;
  }
  get creatorId(): string {
    return this.props.creatorId;
  }
  get name(): string {
    return this.props.name;
  }
  get gender(): string | null {
    return this.props.gender;
  }
  get birthDate(): Date | null {
    return this.props.birthDate;
  }

  get metadata(): Record<string, any> {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON() {
    return {
      ...this.props,
      ...this.props.metadata,
    };
  }
}
