import { OrganType, OrganTypeUtils } from '../value-objects/OrganType';
import { type ParentRef, ParentType } from '../value-objects/ParentRef';

export interface WorkspaceProps {
  id: string;
  creatorId: string;
  parent: ParentRef;
  annotationTypeIds: string[];
  name: string;
  organType: OrganType;
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
    const parentRef: ParentRef = {
      id: 'None',
      type: ParentType.None,
    };

    //check organ type
    if (!OrganTypeUtils.isValid(data.organ_type)) {
      throw new Error('Invalid organ type');
    }

    return new Workspace({
      id: data.id,
      creatorId: data.creator_id,
      parent: parentRef,
      annotationTypeIds:
        data.annotationTypeIds ||
        data.annotation_type_ids ||
        data.annotation_types ||
        (data.annotationTypeId ? [data.annotationTypeId] : []) ||
        [],
      name: data.name,
      organType: data.organ_type,
      organization: data.organization,
      description: data.description,
      license: data.license,
      resourceURL: data.resource_url ?? null,
      releaseYear: data.release_year ?? null,
      createdAt: typeof data.created_at === 'string' ? new Date(data.created_at) : data.created_at,
      updatedAt: typeof data.updated_at === 'string' ? new Date(data.updated_at) : data.updated_at,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get creatorId(): string {
    return this.props.creatorId;
  }

  get annotationTypeIds(): string[] {
    return this.props.annotationTypeIds;
  }

  get organType(): string {
    return this.props.organType;
  }

  get organization(): string {
    return this.props.organization;
  }

  get description(): string {
    return this.props.description;
  }

  get license(): string {
    return this.props.license;
  }

  get resourceURL(): string | null {
    return this.props.resourceURL;
  }

  get releaseYear(): number | null {
    return this.props.releaseYear;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  hasAnnotationType(): boolean {
    return this.annotationTypeIds.length > 0;
  }

  canCreatePatient(): boolean {
    return this.hasAnnotationType();
  }

  toJSON() {
    return { ...this.props };
  }
}
