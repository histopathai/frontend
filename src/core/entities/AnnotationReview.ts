import type { ParentRef } from '../value-objects';

export interface AnnotationReviewProps {
  id: string;
  parent: ParentRef;
  reviewerId: string;
  status: 'approved' | 'rejected' | 'modified';
  comments?: string;
  modifiedValue?: any;
  modifiedPolygon?: Array<{ X: number; Y: number }>;
  reviewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class AnnotationReview {
  private constructor(private props: AnnotationReviewProps) {}

  static create(data: any): AnnotationReview {
    return new AnnotationReview({
      id: data.id,
      parent: data.parent,
      reviewerId: data.reviewer_id,
      status: data.status,
      comments: data.comments,
      modifiedValue: data.modified_value,
      modifiedPolygon: data.modified_polygon,
      reviewedAt: new Date(data.reviewed_at),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    });
  }

  get id(): string {
    return this.props.id;
  }
  get parent(): ParentRef {
    return this.props.parent;
  }
  get reviewerId(): string {
    return this.props.reviewerId;
  }
  get status(): 'approved' | 'rejected' | 'modified' {
    return this.props.status;
  }
  get comments(): string | undefined {
    return this.props.comments;
  }
  get modifiedValue(): any {
    return this.props.modifiedValue;
  }
  get modifiedPolygon(): Array<{ X: number; Y: number }> | undefined {
    return this.props.modifiedPolygon;
  }
  get reviewedAt(): Date {
    return this.props.reviewedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON() {
    return {
      ...this.props,
      reviewedAt: this.reviewedAt.toISOString(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
