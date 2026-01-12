export interface PatientProps {
  id: string;
  creatorId: string;
  workspaceId: string;
  name: string;
  age: number | null;
  gender: string | null;
  race: string | null;
  disease: string | null;
  subtype: string | null;
  grade: number | null;
  history: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Patient {
  private constructor(private props: PatientProps) {}

  static create(data: any): Patient {
    return new Patient({
      id: data.id,
      creatorId: data.creator_id,
      workspaceId: data.parent?.id || data.workspace_id,
      name: data.name,
      age: data.age ?? null,
      gender: data.gender ?? null,
      race: data.race ?? null,
      disease: data.disease ?? null,
      subtype: data.subtype ?? null,
      grade: data.grade ?? null,
      history: data.history ?? null,
      createdAt: typeof data.created_at === 'string' ? new Date(data.created_at) : data.created_at,
      updatedAt: typeof data.updated_at === 'string' ? new Date(data.updated_at) : data.updated_at,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get creatorId(): string {
    return this.props.creatorId;
  }

  get workspaceId(): string {
    return this.props.workspaceId;
  }

  get name(): string {
    return this.props.name;
  }

  get age(): number | null {
    return this.props.age;
  }

  get gender(): string | null {
    return this.props.gender;
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

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  hasDemographics(): boolean {
    return this.age !== null || this.gender !== null || this.race !== null;
  }

  toJSON() {
    return { ...this.props };
  }
}
