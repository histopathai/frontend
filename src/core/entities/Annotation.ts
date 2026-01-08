import { Point } from '../value-objects/Point';
import type { TagValue } from '@/core/types/tags';

export interface ParentRef {
  id: string;
  type: 'workspace' | 'patient' | 'image' | 'annotation_type' | string;
}

export interface AnnotationProps {
  id: string;
  parent: ParentRef | null;

  annotatorId: string;
  polygon: Point[];
  data: TagValue[];

  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Annotation {
  private constructor(private props: AnnotationProps) {}

  static create(data: any): Annotation {
    let tagValues: TagValue[] = [];

    if (data.tag) {
      tagValues.push({
        tagName: data.tag.tag_name,
        tagType: data.tag.tag_type,
        value: data.tag.value,
      });
    }

    let parentRef: ParentRef | null = null;
    if (data.parent) {
      parentRef = {
        id: data.parent.id,
        type: data.parent.type,
      };
    }

    return new Annotation({
      id: data.id,
      parent: parentRef,

      annotatorId: data.creator_id || data.annotator_id,

      polygon: (data.polygon || []).map((p: any) => Point.from(p)),
      data: tagValues,
      description: data.description ?? null,
      createdAt: typeof data.created_at === 'string' ? new Date(data.created_at) : data.created_at,
      updatedAt: typeof data.updated_at === 'string' ? new Date(data.updated_at) : data.updated_at,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get imageId(): string {
    if (this.props.parent && this.props.parent.type === 'image') {
      return this.props.parent.id;
    }
    return '';
  }

  get typeId(): string {
    const tag = this.props.data.find((t) => t.tagName === 'AnnotationType' || true);
    return tag ? tag.tagType : '';
  }

  get parent(): ParentRef | null {
    return this.props.parent;
  }

  get polygon(): Point[] {
    return [...this.props.polygon];
  }

  get description(): string | null {
    return this.props.description;
  }

  get data(): TagValue[] {
    return this.props.data;
  }

  get annotatorId(): string {
    return this.props.annotatorId;
  }

  getValue(tagName: string): any {
    const tag = this.props.data.find((d) => d.tagName === tagName);
    return tag ? tag.value : null;
  }

  getPolygonForSerialization(): { x: number; y: number }[] {
    return this.polygon.map((p) => p.toJSON());
  }

  toJSON() {
    return {
      ...this.props,
      polygon: this.getPolygonForSerialization(),
    };
  }
}
