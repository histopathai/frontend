import type {
  BlindTest,
  BlindTestLabel,
  BlindTestProgress,
  BlindTestResults,
  BlindTestScore,
  BlindTestSummary,
  IBlindTestRepository,
} from '@/core/repositories/IBlindTestRepository';
import { ApiClient } from '../api/ApiClient';

const BASE = '/api/v1/proxy/blind-tests';

function progressFromApi(d: any): BlindTestProgress {
  return { answers: d.answers ?? {}, completedAt: d.completed_at ?? null };
}

function scoreFromApi(s: any): BlindTestScore {
  const c = s.confusion ?? {};
  return {
    answered: s.answered,
    correct: s.correct,
    accuracy: s.accuracy,
    pValue: s.p_value,
    syntheticCalledReal: s.synthetic_called_real,
    confusion: {
      realAsReal: c.real_as_real ?? 0,
      realAsSynthetic: c.real_as_synthetic ?? 0,
      syntheticAsReal: c.synthetic_as_real ?? 0,
      syntheticAsSynthetic: c.synthetic_as_synthetic ?? 0,
    },
  };
}

export class BlindTestRepository implements IBlindTestRepository {
  constructor(private apiClient: ApiClient) {}

  async list(): Promise<BlindTestSummary[]> {
    const response = await this.apiClient.get<any>(BASE);
    return response.data ?? [];
  }

  async get(id: string): Promise<BlindTest> {
    const response = await this.apiClient.get<any>(`${BASE}/${id}`);
    const d = response.data;
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      imageIds: d.image_ids ?? [],
      ...progressFromApi(d),
    };
  }

  async answer(id: string, imageId: string, label: BlindTestLabel): Promise<BlindTestProgress> {
    const response = await this.apiClient.put<any>(`${BASE}/${id}/answers/${imageId}`, { label });
    return progressFromApi(response.data);
  }

  async complete(id: string): Promise<BlindTestProgress> {
    const response = await this.apiClient.post<any>(`${BASE}/${id}/complete`);
    return progressFromApi(response.data);
  }

  async image(id: string, imageId: string): Promise<Blob> {
    return this.apiClient.getBlob(`${BASE}/${id}/images/${imageId}`);
  }

  async results(id: string): Promise<BlindTestResults> {
    const response = await this.apiClient.get<any>(`${BASE}/${id}/results`);
    const d = response.data;
    return {
      id: d.id,
      name: d.name,
      runId: d.run_id,
      active: d.active,
      pooled: scoreFromApi(d.pooled),
      users: (d.users ?? []).map((u: any) => ({
        userId: u.user_id,
        userRole: u.user_role,
        startedAt: u.started_at,
        updatedAt: u.updated_at,
        completedAt: u.completed_at ?? null,
        score: scoreFromApi(u.score),
      })),
      images: (d.images ?? []).map((i: any) => ({
        imageId: i.image_id,
        label: i.label,
        source: i.source ?? {},
        votedReal: i.voted_real,
        votedSynthetic: i.voted_synthetic,
      })),
    };
  }
}
