import apiClient from '@lib/apiClient';

import type { TokenRefreshResponse, TokenResponse } from '@app-types/domain';

export const authApi = {
  /**
   * @description Authenticates a medtech with the backend and returns a fresh session token.
   * Identifies itself as the mobile client so the backend can refuse non-MedTech accounts.
   * @param username - Laboratory login username.
   * @param password - Account password.
   * @param keepSignedIn - "Keep me logged in for this shift": the session lasts the whole
   * shift instead of one access-token lifetime.
   * @param signal - Aborts the request if the screen unmounts before it resolves.
   */
  async login(
    username: string,
    password: string,
    keepSignedIn: boolean,
    signal?: AbortSignal,
  ): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>(
      '/auth/login',
      { username, password, keepSignedIn, client: 'mobile' },
      { signal },
    );
    return response.data;
  },

  /**
   * @description Renews the caller's access token for the same session, so an active
   * medtech isn't signed out mid-task.
   * @param signal - Aborts the request if the caller no longer needs the result.
   */
  async refresh(signal?: AbortSignal): Promise<TokenRefreshResponse> {
    const response = await apiClient.post<TokenRefreshResponse>('/auth/refresh', undefined, {
      signal,
    });
    return response.data;
  },

  /**
   * @description Invalidates the current session on the backend. Recorded as a timeout
   * rather than a manual logout when `reason` is given — a manual logout also stops
   * pushes to this device, an inactivity sign-out doesn't.
   * @param reason - `"INACTIVITY"` when the app is signing the medtech out for being idle.
   * @param signal - Aborts the request if the caller no longer needs the result.
   */
  async logout(reason?: 'INACTIVITY', signal?: AbortSignal): Promise<void> {
    await apiClient.post('/auth/logout', reason ? { reason } : undefined, { signal });
  },
};
