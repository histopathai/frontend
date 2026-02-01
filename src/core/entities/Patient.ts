import { ParentRefUtils, ParentType, type ParentRef } from '../value-objects';

export interface PatientProps {
  id: string;
  parent: ParentRef;
  creatorId: string;
  name: string;
  gender: string | null;
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
      parent,
      workspace_id,
      creator_id,
      name,
      gender,
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

    if (!parent) {
      throw new Error('Parent reference is required');
    }
    if (!ParentRefUtils.isValid(parent)) {
      throw new Error('Invalid parent reference');
    }

    return new Patient({
      id,
      parent,
      creatorId: creator_id,
      name,
      gender: gender ?? null,
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
  get parent(): ParentRef {
    return this.props.parent;
  }
  get workspaceId(): string {
    return this.props.parent.id;
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
