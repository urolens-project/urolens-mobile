import apiClient from '@lib/apiClient';
import { TokenResponse } from '@app-types/domain';
import { mockTokenResponse } from '@mocks/fixtures/auth';

export const authApi = {
  async login(username: string, password: string): Promise<TokenResponse> {
    // DEV MOCK: use username "medtech" / any password to bypass backend
    if (process.env.EXPO_PUBLIC_APP_ENV === 'development' && username === 'medtech') {
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
