import axios, { type AxiosInstance } from 'axios';
import type {
  BlindTest,
  BlindTestGuestError,
  BlindTestGuestSession,
  BlindTestInviteInfo,
  BlindTestJoin,
  BlindTestLabel,
  BlindTestParticipantApi,
  IBlindTestGuestRepository,
} from '@/core/repositories/IBlindTestRepository';
import { progressFromApi, testFromApi } from './BlindTestRepository';

/**
 * The blind test for people invited by a shared link, without a platform
 * account: main-service's public routes (auth-service forwards them without a
 * user). The link token picks the invitation; the session token from join /
 * resume goes in X-Guest-Session. A separate HTTP client: these requests carry
 * no user credentials and their errors must not log anybody out.
 */
export class BlindTestGuestRepository implements IBlindTestGuestRepository {
  private http: AxiosInstance;

  constructor(baseURL: string, token: string) {
    this.http = axios.create({
      baseURL: `${baseURL}/api/v1/public/blind-tests/invites/${encodeURIComponent(token)}`,
      timeout: 30000,
      withCredentials: false,
    });
    this.http.interceptors.response.use(undefined, (e) => Promise.reject(guestError(e)));
  }

  async info(): Promise<BlindTestInviteInfo> {
    const d = (await this.http.get('')).data.data;
    return {
      setName: d.set_name,
      description: d.description,
      images: d.images,
      participants: d.participants,
      max: d.max,
      joinable: d.joinable,
      closed: d.closed,
      expired: d.expired,
    };
  }

  async join(j: BlindTestJoin): Promise<BlindTestGuestSession> {
    const d = (await this.http.post('/join', { name: j.name, pin: j.pin, consent: j.consent })).data
      .data;
    return { sessionToken: d.session_token, name: d.name };
  }

  async resume(name: string, pin: string): Promise<BlindTestGuestSession> {
    const d = (await this.http.post('/resume', { name, pin })).data.data;
    return { sessionToken: d.session_token, name: d.name };
  }

  async test(session: string): Promise<{ test: BlindTest; api: BlindTestParticipantApi }> {
    const headers = { 'X-Guest-Session': session };
    const test = testFromApi((await this.http.get('/test', { headers })).data.data);
    const api: BlindTestParticipantApi = {
      answer: async (imageId: string, label: BlindTestLabel) =>
        progressFromApi(
          (await this.http.put(`/test/answers/${imageId}`, { label }, { headers })).data.data
        ),
      note: async (imageId: string, text: string) =>
        progressFromApi(
          (await this.http.put(`/test/notes/${imageId}`, { note: text }, { headers })).data.data
        ),
      complete: async () =>
        progressFromApi((await this.http.post('/test/complete', null, { headers })).data.data),
      image: async (imageId: string) =>
        (
          await this.http.get(`/test/images/${imageId}`, {
            headers,
            responseType: 'blob',
            timeout: 60000,
          })
        ).data,
    };
    return { test, api };
  }
}

function guestError(e: any): BlindTestGuestError {
  const body = e?.response?.data ?? {};
  const details = body.details ?? {};
  return {
    status: e?.response?.status ?? 0,
    code: details.code ?? (e?.response ? 'error' : 'network'),
    message: body.message ?? e?.message ?? 'İstek başarısız',
    details,
  };
}
