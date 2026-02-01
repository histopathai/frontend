import { ParentType, TagType, type ParentRef } from '../value-objects';

export interface AnnotationTypeProps {
  id: string;
  name: string;
  parent: ParentRef | null;
  creatorId: string;
  description: string | null;
  type: TagType;
  options: string[];
  global: boolean;
  required: boolean;
  min?: number;
  max?: number;

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
        id: 'None',
        type: ParentType.None,
      };
    }

    const props: AnnotationTypeProps = {
      id: String(data.id),
      creatorId: data.creator_id,

      name: data.name,
      description: data.description ?? null,

      type: data.type,
      options: data.options || [],
      global: data.global || false,
      required: data.required || false,
      min: data.min,
      max: data.max,

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

  get parent(): ParentRef | null {
    return this.props.parent;
  }
  get parentId(): string | null {
    return this.props.parent?.id ?? null;
  }

  toJSON() {
    return {
      ...this.props,
      parentId: this.parentId,
    };
  }
}
