// infrastructure/api/ApiClient.ts
import axios, { type AxiosInstance, AxiosError } from 'axios';
import type { ApiError } from '@/core/types/common';
import { useAuthStore } from '@/stores/auth';

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Session cookie
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          // --- 2. DEĞİŞİKLİK: 401 yönetimi güncellendi ---

          // Store'dan bir örnek al
          const authStore = useAuthStore();

          // "Hard refresh" YERİNE merkezi eylemi çağır
          authStore.handleUnauthorized();

          // 'window.location.href = '/login';' satırını sildik.

          // Hatayı burada sonlandırıyoruz. 'handleUnauthorized'
          // zaten kullanıcıyı bilgilendirip yönlendirdi.
          // 'throw error;' yapsaydık, API'yi çağıran
          // composable (örn. useWorkspaces) da hatayı yakalayıp
          // ikinci bir toast mesajı gösterecekti.
          // Bu şekilde çift hatayı engelliyoruz.
          return Promise.reject(new Error('Oturum sonlandı veya yetkisiz.'));
          // --- DEĞİŞİKLİK SONU ---
        }

        // Diğer hatalar (404, 500 vb.) normal şekilde fırlatılmaya devam eder
        throw error;
      }
    );
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

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }
}
