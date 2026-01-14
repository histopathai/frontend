import { Point } from '../value-objects/Point';
import type { TagValue } from '@/core/types/tags';

export interface ParentRef {
  id: string;
  type: 'workspace' | 'patient' | 'image' | 'annotation_type' | string;
}

// Frontend'in her zaman beklediği standart yapı
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

    // 1. Durum: Veriler data'nın kökünde (flat) geliyorsa (Sizin DB yapınız)
    // tag_type, name, tag_value gibi alanlar kontrol ediliyor.
    if (
      data.tag_name ||
      data.tagName ||
      data.name ||
      data.tag_type ||
      data.tagType ||
      data.type ||
      data.tag_value
    ) {
      tagObj = {
        // TİP: tag_type, tagType veya type
        tag_type: data.tag_type || data.tagType || data.type || 'TEXT',

        // İSİM: tag_name YOKSA 'name' alanını kullan (DB'de 'name' var demiştiniz)
        tag_name: data.tag_name || data.tagName || data.name || 'İsimsiz Etiket',

        // DEĞER: value YOKSA 'tag_value' alanını kullan
        value: data.value ?? data.tag_value ?? null,

        color: data.color || '#4F46E5', // Varsayılan renk
        global: data.global ?? false,
      };
    }
    // 2. Durum: Veriler 'tag' objesi içinde geliyorsa (Pending veya bazı API yanıtları)
    else if (data.tag) {
      tagObj = {
        tag_type: data.tag.tag_type || data.tag.tagType || 'TEXT',
        tag_name: data.tag.tag_name || data.tag.tagName || data.tag.name || 'Bilinmeyen',
        value: data.tag.value ?? data.tag.tag_value,
        color: data.tag.color,
        global: data.tag.global ?? false,
      };
    }

    let parentRef: ParentRef | null = null;
    if (data.parent) {
      parentRef = { id: data.parent.id, type: data.parent.type };
    } else if (data.image_id) {
      parentRef = { id: data.image_id, type: 'image' };
    }

    return new Annotation({
      id: String(data.id),
      parent: parentRef,
      annotatorId: data.annotator_id || data.creator_id || '',
      polygon: (data.polygon || []).map((p: any) => Point.from(p)),
      data: data.data || [],
      tag: tagObj, // Oluşturulan standart tag objesi
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
