import type { AnnotationReview } from '../entities/AnnotationReview';

export interface CreateAnnotationReviewRequest {
  annotation_id: string;
  status: 'approved' | 'rejected' | 'modified';
  comments?: string;
  modified_value?: any;
  modified_polygon?: Array<{ X: number; Y: number }>;
}

export interface IAnnotationReviewRepository {
  create(data: CreateAnnotationReviewRequest): Promise<AnnotationReview>;
  delete(id: string): Promise<void>;
  getByAnnotationId(annotationId: string): Promise<AnnotationReview[]>;
}
