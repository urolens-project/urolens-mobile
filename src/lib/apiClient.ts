import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '@lib/auth/tokenStorage';
import { useAuthStore } from '@lib/auth/authStore';
import { router } from 'expo-router';
import { ApiError } from '@app-types/domain';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach JWT on every request
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Handle 401 — clear auth and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      await tokenStorage.clearAll();
      useAuthStore.getState().clearAuth();
      router.replace('/(auth)/login');
    }
    const data = error.response?.data as { error?: ApiError } | undefined;
    const apiError: ApiError = data?.error ?? {
      code: 'UNKNOWN_ERROR',
      message: error.message ?? 'An unexpected error occurred.',
    };
    return Promise.reject(apiError);
  },
);

export default apiClient;
