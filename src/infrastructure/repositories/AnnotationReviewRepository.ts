import type {
  CreateAnnotationReviewRequest,
  IAnnotationReviewRepository,
} from '@/core/repositories/IAnnotationReviewRepository';
import { AnnotationReview } from '@/core/entities/AnnotationReview';
import { ApiClient } from '../api/ApiClient';

export class AnnotationReviewRepository implements IAnnotationReviewRepository {
  constructor(private apiClient: ApiClient) {}

  async create(data: CreateAnnotationReviewRequest): Promise<AnnotationReview> {
    const response = await this.apiClient.post<any>('/api/v1/proxy/annotation-reviews', data);
    const result = response.data || response;
    return AnnotationReview.create(result);
  }

  async update(id: string, data: Partial<CreateAnnotationReviewRequest>): Promise<AnnotationReview> {
    const response = await this.apiClient.put<any>(`/api/v1/proxy/annotation-reviews/${id}`, data);
    const result = response.data || response;
    return AnnotationReview.create(result);
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/v1/proxy/annotation-reviews/${id}`);
  }

  async getByAnnotationId(annotationId: string): Promise<AnnotationReview[]> {
    const path = `/api/v1/proxy/annotation-reviews/annotation/${annotationId}`;
    try {
      const response = await this.apiClient.get<any>(path);
      
      // Backend'in farklı yanıt formatlarını (data.data veya direkt dizi) destekleyelim
      const data = response?.data?.data || response?.data || (Array.isArray(response) ? response : []);
      
      if (!Array.isArray(data)) {
        return [];
      }
      
      return data.map(review => AnnotationReview.create(review));
    } catch (e) {
      return [];
    }
  }
}
