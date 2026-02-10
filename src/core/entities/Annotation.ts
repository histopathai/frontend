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

    // Backend sends ws_id, frontend expects workspace_id. Support both.
    const workspaceId = data.workspace_id || data.ws_id;
    if (!workspaceId) {
      throw new Error('Workspace ID is required');
    }

    const annotationTypeId = data.annotation_type_id || data.annotationTypeId;
    if (!annotationTypeId) {
      throw new Error('Annotation type ID is required');
    }

    // Check TagType
    // Backend sends tag_type, frontend expects type. Support both.
    const tagType = data.type || data.tag_type;
    // If tagType is string, try to convert or validate it
    if (!tagType || !TagTypeUtils.isValid(tagType as TagType)) {
      // Also check if tag_type is valid string from backend
      if (!Object.values(TagType).includes(tagType as TagType)) {
        throw new Error('Invalid tag type');
      }
    }

    const props: AnnotationProps = {
      id: data.id,
      name: data.name,
      creatorId: data.creator_id || data.creatorId,
      parent: data.parent,
      annotationTypeId: annotationTypeId,
      workspaceId: workspaceId,
      value: data.value,
      type: tagType as TagType,
      polygon: data.polygon,
      isGlobal: data.is_global || data.isGlobal,
      color: data.color,
      createdAt:
        typeof data.created_at === 'string'
          ? new Date(data.created_at)
          : data.createdAt || data.created_at,
      updatedAt:
        typeof data.updated_at === 'string'
          ? new Date(data.updated_at)
          : data.updatedAt || data.updated_at,
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
