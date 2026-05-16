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
  imageCount: number;
  completedImageCount: number;
  metadata_config?: any;
}

export class Workspace {
  private constructor(private props: WorkspaceProps) {}

  static create(data: any): Workspace {
    const parentRef: ParentRef = {
      id: 'None',
      type: ParentType.None,
    };

    const organType = data.organ_type || data.organType;
    //check organ type
    if (!OrganTypeUtils.isValid(organType)) {
      throw new Error('Invalid organ type: ' + organType);
    }

    return new Workspace({
      id: data.id,
      creatorId: data.creator_id || data.creatorId,
      parent: parentRef,
      annotationTypeIds:
        data.annotationTypeIds || data.annotation_type_ids || data.annotation_types || [],
      name: data.name,
      organType: organType,
      organization: data.organization,
      description: data.description,
      license: data.license,
      resourceURL: data.resource_url ?? data.resourceURL ?? null,
      releaseYear: data.release_year ?? data.releaseYear ?? null,
      createdAt: typeof (data.created_at || data.createdAt) === 'string' ? new Date(data.created_at || data.createdAt) : (data.created_at || data.createdAt),
      updatedAt: typeof (data.updated_at || data.updatedAt) === 'string' ? new Date(data.updated_at || data.updatedAt) : (data.updated_at || data.updatedAt),
      imageCount: data.image_count || data.imageCount || data.total_images || data.stats?.total || data.statistics?.total || 0,
      completedImageCount: data.completed_image_count || data.completedImageCount || data.completed_images || data.stats?.completed || data.statistics?.completed || 0,
      metadata_config: data.metadata_config || data.metadataConfig || data.metadata || data.config?.metadata_config || data.config?.metadata || data.properties?.metadata_config || data.workspace_config?.metadata_config || undefined,
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

  get imageCount(): number {
    return this.props.imageCount;
  }

  get completedImageCount(): number {
    return this.props.completedImageCount;
  }

  get isCompleted(): boolean {
    return this.imageCount > 0 && this.imageCount === this.completedImageCount;
  }
  
  get metadata_config(): any {
    return this.props.metadata_config;
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
