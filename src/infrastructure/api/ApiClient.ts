import axios, { type AxiosInstance, AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth';
import { i18n } from '@/i18n';

const t = i18n.global.t;

export class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  // Bir 401 geldiğinde oturumun gerçekten geçersiz olup olmadığını doğrulamak için
  // yapılan session kontrolünü paylaşır; eşzamanlı 401'lerde tek istek atılır.
  private sessionProbeInFlight: Promise<boolean> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
      timeout: 30000,
      transformResponse: [
        (data, headers) => {
          // Safe JSON parse: if the body is not valid JSON (e.g. backend returns
          // plain-text or HTML on error), return a wrapper object so the
          // response interceptor can extract a message without throwing SyntaxError.
          if (typeof data === 'string' && data.length > 0) {
            try {
              return JSON.parse(data);
            } catch {
              return { _rawBody: data, message: data.substring(0, 200) };
            }
          }
          return data;
        },
      ],
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        config.metadata = { startTime: new Date() };
        const authStore = useAuthStore();
        if (authStore.token) {
          config.headers.Authorization = `Bearer ${authStore.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error: AxiosError<any>) => {
        if (error.response?.status === 401) {
          const authStore = useAuthStore();
          const url = error.config?.url || '';
          const reject401 = () =>
            Promise.reject({ message: t('errors.401'), status: 401, originalError: error });

          // Henüz oturum açılmamışsa (login/verify akışı) düşürülecek bir oturum yok.
          if (!authStore.isAuthenticated) {
            return reject401();
          }

          // 401 doğrudan oturum kontrol ucundan geldiyse oturum kesin olarak geçersizdir.
          if (url.includes('/sessions/current')) {
            authStore.forceLogout();
            return reject401();
          }

          // Diğer uçlardan (özellikle /proxy/* görüntü ve kaynak istekleri) gelen 401,
          // geçici bir gateway/kaynak hatası olabilir; oturumu düşürmeden önce doğrula.
          // Sadece oturum gerçekten geçersizse logout yapılır — bozuk bir görüntü
          // isteği tüm oturumu düşürmez.
          const stillValid = await this.isSessionStillValid();
          if (!stillValid) {
            authStore.forceLogout();
          }
          return reject401();
        }

        if (error.response?.status === 400) {
          const data = error.response.data as any;
          return Promise.reject({
            message: data?.message || data?.error || t('errors.unknown'),
            status: 400,
            originalError: error,
          });
        }

        if (error.response?.status === 403) {
          return Promise.reject({
            message: t('errors.403'),
            status: 403,
            originalError: error,
          });
        }

        if (error.response?.status === 404) {
          return Promise.reject({
            message: t('errors.404'),
            status: 404,
            originalError: error,
          });
        }

        if (error.response?.status === 409) {
          return Promise.reject({
            message: error.response.data?.message || t('errors.409'),
            status: 409,
            originalError: error,
          });
        }

        if (error.response?.status === 422) {
          return Promise.reject({
            message: error.response.data?.details?.error || error.response.data?.message || t('errors.422'),
            status: 422,
            errors: error.response.data?.errors,
            details: error.response.data?.details,
            originalError: error,
          });
        }

        if (error.response && error.response.status >= 500) {
          return Promise.reject({
            message: t('errors.500'),
            status: error.response.status,
            originalError: error,
          });
        }

        if (error.code === 'ECONNABORTED') {
          return Promise.reject({
            message: t('errors.timeout'),
            status: 0,
            originalError: error,
          });
        }

        if (!error.response) {
          return Promise.reject({
            message: t('errors.network'),
            status: 0,
            originalError: error,
          });
        }

        return Promise.reject({
          message: error.response?.data?.message || t('errors.unknown'),
          status: error.response?.status || 0,
          originalError: error,
        });
      }
    );
  }

  // Oturum kontrol ucuna interceptor'ı BYPASS ederek ham bir istek atar; böylece
  // buradan dönen olası bir 401 tekrar bu mantığı tetiklemez (sonsuz döngü önlenir).
  // Eşzamanlı 401'lerde aynı uçuş içi istek paylaşılır.
  private isSessionStillValid(): Promise<boolean> {
    if (this.sessionProbeInFlight) return this.sessionProbeInFlight;

    const authStore = useAuthStore();
    this.sessionProbeInFlight = axios
      .get(`${this.baseURL}/api/v1/sessions/current`, {
        withCredentials: true,
        headers: authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {},
        timeout: 10000,
      })
      .then((res) => !!res.data?.session)
      .catch((err: any) => {
        // Yalnızca kesin 401'de oturumu geçersiz say. Ağ hatası / timeout / 5xx gibi
        // belirsiz durumlarda oturumu koru — yanlış logout'u önle.
        if (err?.response?.status === 401) return false;
        return true;
      })
      .finally(() => {
        this.sessionProbeInFlight = null;
      });

    return this.sessionProbeInFlight;
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  async uploadFile<T>(url: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const response = await this.client.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: {
      startTime: Date;
    };
  }
}
