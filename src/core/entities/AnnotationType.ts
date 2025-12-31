export type AnnotationInputType = 'text' | 'number' | 'select' | 'multi_select' | 'boolean';

export interface AnnotationTypeProps {
  id: string;
  creatorId: string;
  name: string;
  description: string | null;

  // Form Builder Özellikleri
  inputType: AnnotationInputType;
  options: string[] | null;
  min: number | null;
  max: number | null;
  required: boolean;

  // Görsel ve Hiyerarşi Özellikleri
  parentId: string | null;
  color: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export class AnnotationType {
  private constructor(private props: AnnotationTypeProps) {}

  static create(data: any): AnnotationType {
    const props: AnnotationTypeProps = {
      id: data.id,
      creatorId: data.creator_id,
      name: data.name,
      description: data.description ?? null,

      // Backend'den gelen veri yapısına göre map ediyoruz
      // Eğer input_type yoksa varsayılan olarak 'select' veya 'text' düşünebiliriz
      inputType: data.input_type ?? 'select',
      options: data.class_list ?? [], // Backend 'class_list' olarak saklıyorsa
      min: data.score_min ?? null,
      max: data.score_max ?? null,
      required: data.required ?? false,

      parentId: data.parent_id ?? null,
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

  get inputType(): AnnotationInputType {
    return this.props.inputType;
  }
  get options(): string[] {
    return this.props.options || [];
  }
  get min(): number | null {
    return this.props.min;
  }
  get max(): number | null {
    return this.props.max;
  }
  get required(): boolean {
    return this.props.required;
  }

  get parentId(): string | null {
    return this.props.parentId;
  }
  get color(): string | null {
    return this.props.color;
  }

  get isRoot(): boolean {
    return !this.props.parentId;
  }

  toJSON() {
    return { ...this.props };
  }
}
