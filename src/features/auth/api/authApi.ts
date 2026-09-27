import apiClient from '@lib/apiClient';

import type { TokenResponse } from '@app-types/domain';

export const authApi = {
  /**
   * @description Authenticates a medtech with the backend and returns a fresh session token.
   * @param username - Laboratory login username.
   * @param password - Account password.
   * @param signal - Aborts the request if the screen unmounts before it resolves.
   */
  async login(username: string, password: string, signal?: AbortSignal): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>(
      '/auth/login',
      { username, password },
      { signal },
    );
    return response.data;
  },

  /**
   * @description Invalidates the current session on the backend.
   * @param signal - Aborts the request if the caller no longer needs the result.
   */
  async logout(signal?: AbortSignal): Promise<void> {
    await apiClient.post('/auth/logout', undefined, { signal });
  },
};
