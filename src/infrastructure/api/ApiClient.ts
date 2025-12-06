// infrastructure/api/ApiClient.ts
import axios, { type AxiosInstance, AxiosError } from 'axios';
import type { ApiError } from '@/core/types/common';
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
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: new Date() };
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error: AxiosError<ApiError>) => {
        // 401 Unauthorized
        if (error.response?.status === 401) {
          const authStore = useAuthStore();
          authStore.forceLogout();

          // Custom error mesajı
          return Promise.reject({
            message: t('errors.401'),
            status: 401,
            originalError: error,
          });
        }

        // 403 Forbidden - Yetki yok
        if (error.response?.status === 403) {
          return Promise.reject({
            message: t('errors.403'),
            status: 403,
            originalError: error,
          });
        }

        // 404 Not Found
        if (error.response?.status === 404) {
          return Promise.reject({
            message: t('errors.404'),
            status: 404,
            originalError: error,
          });
        }

        // 409 Conflict
        if (error.response?.status === 409) {
          return Promise.reject({
            message: error.response.data?.message || t('errors.409'),
            status: 409,
            originalError: error,
          });
        }

        // 422 Validation Error
        if (error.response?.status === 422) {
          return Promise.reject({
            message: error.response.data?.message || t('errors.422'),
            status: 422,
            errors: error.response.data?.errors,
            originalError: error,
          });
        }

        // 500+ Server Error
        if (error.response && error.response.status >= 500) {
          return Promise.reject({
            message: t('errors.500'),
            status: error.response.status,
            originalError: error,
          });
        }

        // Network hatası veya timeout
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

        // Diğer hatalar
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

// Type augmentation for metadata
declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: {
      startTime: Date;
    };
  }
}
