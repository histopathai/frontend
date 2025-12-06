export interface AnnotationTypeProps {
  id: string;
  creatorId: string;
  name: string;
  description: string | null;
  scoreEnabled: boolean;
  classificationEnabled: boolean;
  scoreName: string | null;
  scoreMin: number | null;
  scoreMax: number | null;
  classList: string[] | null;
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
      scoreEnabled: data.score_enabled,
      classificationEnabled: data.classification_enabled,
      scoreName: data.score_name ?? null,
      scoreMin: data.score_min ?? null,
      scoreMax: data.score_max ?? null,
      classList: data.class_list ?? null,
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

  get scoreEnabled(): boolean {
    return this.props.scoreEnabled;
  }

  get classificationEnabled(): boolean {
    return this.props.classificationEnabled;
  }

  get classList(): string[] | null {
    return this.props.classList ? [...this.props.classList] : null;
  }

  // Business logic
  supportsScoring(): boolean {
    return this.scoreEnabled;
  }

  supportsClassification(): boolean {
    return this.classificationEnabled;
  }

  scoreRange(): { min: number; max: number } | null {
    return this.scoreEnabled && this.props.scoreMin !== null && this.props.scoreMax !== null
      ? { min: this.props.scoreMin, max: this.props.scoreMax }
      : null;
  }

  classListForSerialization(): string[] | null {
    return this.classificationEnabled && this.props.classList ? [...this.props.classList] : null;
  }

  toJSON() {
    return { ...this.props };
  }
}
