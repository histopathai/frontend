import type { TagDefinition, TagType } from '@/core/types/tags';

export interface ParentRef {
  id: string;
  type: 'workspace' | 'patient' | 'image' | 'annotation_type' | string;
}

export interface AnnotationTypeProps {
  id: string;
  creatorId: string;
  name: string;
  description: string | null;
  type: TagType;
  options: string[];
  global: boolean;
  required: boolean;
  min?: number;
  max?: number;
  tags: TagDefinition[];
  patientFields: TagDefinition[];
  parent: ParentRef | null;

  color: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export class AnnotationType {
  private constructor(private props: AnnotationTypeProps) {}

  static create(data: any): AnnotationType {
    let parentRef: ParentRef | null = null;
    if (data.parent) {
      parentRef = {
        id: data.parent.id,
        type: data.parent.type,
      };
    } else if (data.parent_id) {
      parentRef = {
        id: data.parent_id,
        type: 'workspace',
      };
    }

    const resolvedName = data.name || data.tag_name || data.tagName || 'İsimsiz Tip';
    const resolvedType = data.type || data.tag_type || data.tagType || 'TEXT';

    const props: AnnotationTypeProps = {
      id: String(data.id),
      creatorId: data.creator_id || data.creatorId || '',

      name: resolvedName,
      description: data.description ?? null,

      type: resolvedType,
      options: data.options || [],
      global: data.global || false,
      required: data.required || false,
      min: data.min,
      max: data.max,

      parent: parentRef,
      color: data.color ?? null,

      createdAt: data.created_at
        ? typeof data.created_at === 'string'
          ? new Date(data.created_at)
          : data.created_at
        : new Date(),
      updatedAt: data.updated_at
        ? typeof data.updated_at === 'string'
          ? new Date(data.updated_at)
          : data.updated_at
        : new Date(),

      tags: data.tags || data.fields || [],
      patientFields: data.patient_fields || data.metadata_fields || [],
    };

    return new AnnotationType(props);
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string | null {
    return this.props.description;
  }
  get color(): string | null {
    return this.props.color;
  }
  get creatorId(): string {
    return this.props.creatorId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get type(): TagType {
    return this.props.type;
  }
  get options(): string[] {
    return this.props.options;
  }
  get global(): boolean {
    return this.props.global;
  }
  get required(): boolean {
    return this.props.required;
  }
  get min(): number | undefined {
    return this.props.min;
  }
  get max(): number | undefined {
    return this.props.max;
  }

  get tags(): TagDefinition[] {
    return this.props.tags;
  }
  get patientFields(): TagDefinition[] {
    return this.props.patientFields;
  }

  get parent(): ParentRef | null {
    return this.props.parent;
  }
  get parentId(): string | null {
    return this.props.parent?.id ?? null;
  }
  get workspaceId(): string {
    if (this.props.parent && this.props.parent.type === 'workspace') {
      return this.props.parent.id;
    }
    return '';
  }

  toJSON() {
    return {
      ...this.props,
      parentId: this.parentId,
      workspaceId: this.workspaceId,
    };
  }
}
