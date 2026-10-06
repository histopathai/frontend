import type {
  BlindTestInvite,
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

export function inviteFromApi(d: any): BlindTestInvite {
  return {
    id: d.id,
    token: d.token,
    maxParticipants: d.max_participants,
    participants: d.participants ?? 0,
    expiresAt: d.expires_at ?? null,
    active: !!d.active,
    createdAt: d.created_at,
  };
}

export function testFromApi(d: any): BlindTest {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    imageIds: d.image_ids ?? [],
    ...progressFromApi(d),
  };
}

export function progressFromApi(d: any): BlindTestProgress {
  return { answers: d.answers ?? {}, notes: d.notes ?? {}, completedAt: d.completed_at ?? null };
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
    return testFromApi(response.data);
  }

  async answer(id: string, imageId: string, label: BlindTestLabel): Promise<BlindTestProgress> {
    const response = await this.apiClient.put<any>(`${BASE}/${id}/answers/${imageId}`, { label });
    return progressFromApi(response.data);
  }

  async complete(id: string): Promise<BlindTestProgress> {
    const response = await this.apiClient.post<any>(`${BASE}/${id}/complete`);
    return progressFromApi(response.data);
  }

  async note(id: string, imageId: string, text: string): Promise<BlindTestProgress> {
    const response = await this.apiClient.put<any>(`${BASE}/${id}/notes/${imageId}`, {
      note: text,
    });
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
        guest: u.guest ? { name: u.guest.name } : null,
        order: u.order ?? [],
        answers: u.answers ?? {},
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
        notes: (i.notes ?? []).map((n: any) => ({
          userId: n.user_id,
          answer: n.answer ?? '',
          completed: !!n.completed,
          note: n.note,
          updatedAt: n.updated_at,
        })),
      })),
    };
  }

  async listInvites(id: string): Promise<BlindTestInvite[]> {
    const response = await this.apiClient.get<any>(`${BASE}/${id}/invites`);
    return (response.data ?? []).map(inviteFromApi);
  }

  async createInvite(
    id: string,
    maxParticipants: number,
    expiresAt?: string | null
  ): Promise<BlindTestInvite> {
    const response = await this.apiClient.post<any>(`${BASE}/${id}/invites`, {
      max_participants: maxParticipants,
      ...(expiresAt ? { expires_at: expiresAt } : {}),
    });
    return inviteFromApi(response.data);
  }

  async updateInvite(
    id: string,
    inviteId: string,
    change: { active?: boolean; maxParticipants?: number }
  ): Promise<BlindTestInvite> {
    const response = await this.apiClient.put<any>(`${BASE}/${id}/invites/${inviteId}`, {
      ...(change.active !== undefined ? { active: change.active } : {}),
      ...(change.maxParticipants !== undefined ? { max_participants: change.maxParticipants } : {}),
    });
    return inviteFromApi(response.data);
  }
}
