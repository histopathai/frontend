export interface WorkspaceProps {
  id: string;
  creatorId: string;
  annotationTypeId: string | null;
  name: string;
  organType: string;
  organization: string;
  description: string;
  license: string;
  resourceURL: string | null;
  releaseYear: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Workspace {
  private constructor(private props: WorkspaceProps) {}

  static create(data: any): Workspace {
    return new Workspace({
      id: data.id,
      creatorId: data.creatorId,
      annotationTypeId: data.annotationTypeId ?? null,
      name: data.name,
      organType: data.organType,
      organization: data.organization,
      description: data.description,
      license: data.license,
      resourceURL: data.resourceURL ?? null,
      releaseYear: data.releaseYear ?? null,
      createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
      updatedAt: typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt
    });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get annotationTypeId(): string | null {
    return this.props.annotationTypeId;
  }

  // Business logic
  hasAnnotationType(): boolean {
    return this.annotationTypeId !== null;
  }

  canCreatePatient(): boolean {
    return this.hasAnnotationType();
  }

  toJSON() {
    return { ...this.props };
  }
}