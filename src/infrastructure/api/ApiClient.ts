import axios, { type AxiosInstance, AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth';
import { i18n } from '@/i18n';

const t = i18n.global.t;

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
      timeout: 30000,
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
      (error: AxiosError<any>) => {
        if (error.response?.status === 401) {
          const authStore = useAuthStore();
          authStore.forceLogout();

          return Promise.reject({
            message: t('errors.401'),
            status: 401,
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
            message: error.response.data?.message || t('errors.422'),
            status: 422,
            errors: error.response.data?.errors,
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
