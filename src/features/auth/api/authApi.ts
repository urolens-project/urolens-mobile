import apiClient from '@lib/apiClient';
import { TokenResponse } from '@app-types/domain';
import { mockTokenResponse } from '@mocks/fixtures/auth';

export const authApi = {
  async login(username: string, password: string): Promise<TokenResponse> {
    // DEV MOCK: set EXPO_PUBLIC_USE_AUTH_MOCK=true to bypass the backend (username "medtech" / any password)
    if (process.env.EXPO_PUBLIC_USE_AUTH_MOCK === 'true' && username === 'medtech') {
      return mockTokenResponse;
    }
    const response = await apiClient.post<TokenResponse>('/auth/login', {
      username,
      password,
    });
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};
