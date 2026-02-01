import { ParentRefUtils, Point, TagType, TagTypeUtils, type ParentRef } from '../value-objects';

export interface AnnotationProps {
  id: string;
  name: string;
  creatorId: string;
  parent: ParentRef;
  annotationTypeId: string;
  workspaceId: string;
  value: any;
  type: TagType;
  polygon: Point[] | null;
  isGlobal: boolean;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Annotation {
  private constructor(private props: AnnotationProps) {}

  static create(data: any): Annotation {
    if (!data.parent) {
      throw new Error('Parent reference is required');
    }
    if (!ParentRefUtils.isValid(data.parent)) {
      throw new Error('Invalid parent reference');
    }
    if (!data.workspace_id) {
      throw new Error('Workspace ID is required');
    }
    if (!data.annotation_type_id) {
      throw new Error('Annotation type ID is required');
    }
    // Check TagType
    if (!TagTypeUtils.isValid(data.type)) {
      throw new Error('Invalid tag type');
    }

    const props: AnnotationProps = {
      id: data.id,
      name: data.name,
      creatorId: data.creator_id,
      parent: data.parent,
      annotationTypeId: data.annotation_type_id,
      workspaceId: data.workspace_id,
      value: data.value,
      type: data.type,
      polygon: data.polygon,
      isGlobal: data.is_global,
      color: data.color,
      createdAt: typeof data.created_at === 'string' ? new Date(data.created_at) : data.created_at,
      updatedAt: typeof data.updated_at === 'string' ? new Date(data.updated_at) : data.updated_at,
    };
    return new Annotation(props);
  }

  // --- Getters ---
  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get creatorId(): string {
    return this.props.creatorId;
  }
  get annotationTypeId(): string {
    return this.props.annotationTypeId;
  }
  get workspaceId(): string {
    return this.props.workspaceId;
  }
  get value(): any {
    return this.props.value;
  }
  get type(): TagType {
    return this.props.type;
  }
  get isGlobal(): boolean {
    return this.props.isGlobal;
  }
  get color(): string | null {
    return this.props.color;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get imageId(): string {
    return this.props.parent?.id || '';
  }

  get parent(): ParentRef {
    return this.props.parent;
  }

  get parentId(): string {
    return this.props.parent?.id || '';
  }

  get polygon(): Point[] {
    return [...(this.props.polygon || [])];
  }

  getPolygonForSerialization(): { x: number; y: number }[] {
    return this.polygon.map((p) => (typeof p.toJSON === 'function' ? p.toJSON() : p));
  }

  toJSON() {
    return {
      ...this.props,
      polygon: this.getPolygonForSerialization(),
    };
  }
}
