import { Point } from '../value-objects/Point';

export interface AnnotationProps {
  id: string;
  imageId: string;
  annotatorId: string;
  polygon: Point[];
  score: number | null;
  class: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Annotation {
  private constructor(private props: AnnotationProps) {}

  static create(data: any): Annotation {
    return new Annotation({
      id: data.id,
      imageId: data.image_id,
      annotatorId: data.annotator_id,
      polygon: data.polygon.map((p: any) => Point.from(p)),
      score: data.score ?? null,
      class: data.class ?? null,
      description: data.description ?? null,
      createdAt: typeof data.created_at === 'string' ? new Date(data.created_at) : data.created_at,
      updatedAt: typeof data.updated_at === 'string' ? new Date(data.updated_at) : data.updated_at,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get polygon(): Point[] {
    return [...this.props.polygon];
  }

  get score(): number | null {
    return this.props.score;
  }

  get class(): string | null {
    return this.props.class;
  }

  // Business logic
  hasScore(): boolean {
    return this.score !== null;
  }

  hasClassification(): boolean {
    return this.class !== null;
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
