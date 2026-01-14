// src/core/entities/Annotation.ts
import { Point } from '../value-objects/Point';
import type { TagValue } from '@/core/types/tags';

export interface ParentRef {
  id: string;
  type: 'workspace' | 'patient' | 'image' | 'annotation_type' | string;
}

export interface AnnotationTag {
  tag_type: string;
  tag_name: string;
  value: any;
  color?: string;
  global: boolean;
}

export interface AnnotationProps {
  id: string;
  parent: ParentRef | null;
  annotatorId: string;
  polygon: Point[];
  data: TagValue[];
  tag: AnnotationTag | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Annotation {
  private constructor(private props: AnnotationProps) {}

  static create(data: any): Annotation {
    let tagObj: AnnotationTag | null = null;
    if (data.tag && typeof data.tag === 'object') {
      const rawName =
        data.tag.tag_name || data.tag.tagName || data.tag.name || data.tag.label || data.tag.value; // Hiçbiri yoksa value'yu isim yap

      tagObj = {
        tag_type: data.tag.tag_type || data.tag.tagType || data.tag.type || 'TEXT',
        tag_name: rawName || 'İsimsiz Etiket',
        value: data.tag.value ?? data.tag.tag_value ?? null,
        color: data.tag.color || '#4F46E5',
        global: data.tag.global ?? false,
      };
    } else if (
      data.tag_name ||
      data.tagName ||
      data.name ||
      data.tag_type ||
      data.tagType ||
      data.type ||
      data.tag_value
    ) {
      tagObj = {
        tag_type: data.tag_type || data.tagType || data.type || 'TEXT',
        tag_name: data.tag_name || data.tagName || data.name || 'İsimsiz Etiket',
        value: data.value ?? data.tag_value ?? null,
        color: data.color || '#4F46E5',
        global: data.global ?? false,
      };
    }

    // console.groupEnd();

    let parentRef: ParentRef | null = null;
    if (data.parent) {
      parentRef = { id: data.parent.id, type: data.parent.type };
    } else if (data.image_id) {
      parentRef = { id: data.image_id, type: 'image' };
    }

    const normalizedData = (data.data || []).map((item: any) => ({
      // item.tagName yoksa tag_name, name veya label alanlarına bak
      tagName: item.tagName || item.tag_name || item.name || item.label || 'Bilinmeyen',
      value: item.value || item.tag_value,
    }));

    return new Annotation({
      id: String(data.id),
      parent: parentRef,
      annotatorId: data.annotator_id || data.creator_id || '',
      polygon: (data.polygon || []).map((p: any) => Point.from(p)),
      data: normalizedData,
      tag: tagObj,
      description: data.description ?? null,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
    });
  }

  // --- Getters ---
  get id(): string {
    return this.props.id;
  }
  get tag(): AnnotationTag | null {
    return this.props.tag;
  }
  get parent(): ParentRef | null {
    return this.props.parent;
  }
  get imageId(): string {
    if (this.props.parent && this.props.parent.type === 'image') {
      return this.props.parent.id;
    }
    return '';
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
    if (this.props.tag && this.props.tag.tag_name === tagName) {
      return this.props.tag.value;
    }
    const tag = this.props.data.find((d) => d.tagName === tagName);
    return tag ? tag.value : null;
  }

  hasScore(): boolean {
    return this.props.tag?.tag_type === 'NUMBER';
  }

  hasClassification(): boolean {
    return ['SELECT', 'MULTI_SELECT'].includes(this.props.tag?.tag_type || '');
  }

  getPolygonForSerialization(): { x: number; y: number }[] {
    return this.polygon.map((p) => p.toJSON());
  }

  toJSON() {
    return {
      ...this.props,
      polygon: this.getPolygonForSerialization(),
      tag: this.props.tag,
    };
  }
}
