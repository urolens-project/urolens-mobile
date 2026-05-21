import apiClient from '@lib/apiClient';
import { TokenResponse } from '@app-types/domain';

export const authApi = {
  async login(username: string, password: string): Promise<TokenResponse> {
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
