import { Point } from '../value-objects/Point';
import type { TagValue } from '@/core/types/tags';

export interface ParentRef {
  id: string;
  type: 'workspace' | 'patient' | 'image' | 'annotation_type' | string;
}

// Backend'den gelen ve frontend'de kullanılan tag yapısı
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
  data: TagValue[]; // Geriye dönük uyumluluk için
  tag: AnnotationTag | null; // Yeni tag yapısı
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Annotation {
  private constructor(private props: AnnotationProps) {}

  static create(data: any): Annotation {
    let tagValues: TagValue[] = [];
    let tagObj: AnnotationTag | null = null;

    // Backend'den gelen 'tag' verisini işle
    if (data.tag) {
      tagObj = {
        tag_type: data.tag.tag_type,
        tag_name: data.tag.tag_name,
        value: data.tag.value,
        color: data.tag.color,
        global: data.tag.global ?? false,
      };

      // Geriye dönük uyumluluk için 'data' dizisini de doldur
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
    } else if (data.image_id) {
      // Fallback: Eğer parent yoksa image_id kullan
      parentRef = { id: data.image_id, type: 'image' };
    }

    return new Annotation({
      id: data.id,
      parent: parentRef,
      annotatorId: data.annotator_id || data.creator_id || '',
      polygon: (data.polygon || []).map((p: any) => Point.from(p)),
      data: tagValues,
      tag: tagObj,
      description: data.description ?? null,
      createdAt:
        typeof data.created_at === 'string'
          ? new Date(data.created_at)
          : data.created_at || new Date(),
      updatedAt:
        typeof data.updated_at === 'string'
          ? new Date(data.updated_at)
          : data.updated_at || new Date(),
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

  // --- Yardımcı Metodlar ---

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
