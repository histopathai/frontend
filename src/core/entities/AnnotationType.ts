import type { TagDefinition, TagResponseDTO } from '@/core/types/tags';

export interface ParentRef {
  id: string;
  type: 'workspace' | 'patient' | 'image' | 'annotation_type' | string;
}

export interface AnnotationTypeProps {
  id: string;
  creatorId: string;
  name: string;
  description: string | null;

  tags: TagDefinition[];
  parent: ParentRef | null;

  color: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export class AnnotationType {
  private constructor(private props: AnnotationTypeProps) {}

  static create(data: any): AnnotationType {
    const mappedTags: TagDefinition[] = (data.tags || []).map((t: TagResponseDTO) => ({
      name: t.name,
      type: t.type as any, // 'NUMBER' | 'TEXT' etc.
      options: t.options || [],
      global: t.global || false,
      required: t.required || false,
      min: t.min,
      max: t.max,
      color: t.color,
    }));

    let parentRef: ParentRef | null = null;
    if (data.parent) {
      parentRef = {
        id: data.parent.id,
        type: data.parent.type,
      };
    } else if (data.parent_id) {
      parentRef = {
        id: data.parent_id,
        type: 'workspace', // Varsayım
      };
    }

    const props: AnnotationTypeProps = {
      id: data.id,
      creatorId: data.creator_id,
      name: data.name,
      description: data.description ?? null,

      tags: mappedTags,

      parent: parentRef,
      color: data.color ?? null,

      createdAt: typeof data.created_at === 'string' ? new Date(data.created_at) : data.created_at,
      updatedAt: typeof data.updated_at === 'string' ? new Date(data.updated_at) : data.updated_at,
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
  get tags(): TagDefinition[] {
    return this.props.tags;
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

  get isRoot(): boolean {
    return !this.props.parent;
  }

  // --- Tag Helper ---

  getTagDefinition(tagName: string): TagDefinition | undefined {
    return this.props.tags.find((t) => t.name === tagName);
  }

  toJSON() {
    return {
      ...this.props,
      parentId: this.parentId,
      workspaceId: this.workspaceId,
    };
  }
}
