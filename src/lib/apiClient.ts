import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '@lib/auth/tokenStorage';
import { authStoreApi } from '@lib/auth/authStore';
import { router } from 'expo-router';
import { ApiError } from '@app-types/domain';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

/** 401 codes that mean the session itself ended, worth explaining on the login screen. */
const SESSION_END_CODES = new Set(['SESSION_EXPIRED', 'SESSION_ENDED', 'SESSION_IDLE']);

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/** @description Errors with no server response: distinguish a timeout from being unreachable. */
function describeTransportError(error: AxiosError): ApiError {
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return { code: 'TIMEOUT', message: 'The request timed out.' };
    }
    return { code: 'NETWORK_ERROR', message: 'Unable to reach the server.' };
  }
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message ?? 'An unexpected error occurred.',
  };
}

// Attach JWT on every request
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown): Promise<never> => Promise.reject(error),
);

// Handle 401 — clear auth and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError): Promise<never> => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    const data = error.response?.data as { error?: ApiError } | undefined;
    const apiError: ApiError = {
      ...(data?.error ?? describeTransportError(error)),
      status: error.response?.status,
    };
    const retryAfterHeader = error.response?.headers?.['retry-after'];
    const retryAfterSeconds = Number(retryAfterHeader);
    if (retryAfterHeader !== undefined && !Number.isNaN(retryAfterSeconds)) {
      apiError.details = { ...apiError.details, retryAfterSeconds };
    }
    if (error.response?.status === 401 && !isLoginRequest) {
      await tokenStorage.clearAll();
      authStoreApi.clearAuth();
      const sessionMessage = SESSION_END_CODES.has(apiError.code) ? apiError.message : undefined;
      router.replace({
        pathname: '/(auth)/login',
        params: sessionMessage ? { sessionMessage } : undefined,
      });
    }
    return Promise.reject(apiError);
  },
);

export default apiClient;
