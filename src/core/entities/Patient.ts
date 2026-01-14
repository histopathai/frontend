export interface PatientProps {
  id: string;
  workspaceId: string;
  creatorId: string;
  name: string;
  gender: string | null;
  birthDate: Date | null;
  age: number | null;
  race: string | null;
  disease: string | null;
  subtype: string | null;
  grade: number | null;
  history: string | null;

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
      age,
      race,
      disease,
      subtype,
      grade,
      history,
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
      age: age ?? null,
      race: race ?? null,
      disease: disease ?? null,
      subtype: subtype ?? null,
      grade: grade ?? null,
      history: history ?? null,

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

  get age(): number | null {
    return this.props.age;
  }
  get race(): string | null {
    return this.props.race;
  }
  get disease(): string | null {
    return this.props.disease;
  }
  get subtype(): string | null {
    return this.props.subtype;
  }
  get grade(): number | null {
    return this.props.grade;
  }
  get history(): string | null {
    return this.props.history;
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
