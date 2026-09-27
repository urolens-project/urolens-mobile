import { useCallback } from 'react';
import { router } from 'expo-router';

import { useAsyncAction } from '@hooks/useAsyncAction';
import { useAuthStore } from '@lib/auth/authStore';
import { tokenStorage } from '@lib/auth/tokenStorage';
import type { ApiError } from '@app-types/domain';
import type { UserRole } from '@app-types/enums';

import { authApi } from '../api/authApi';

export interface UseAuthResult {
  login: (username: string, password: string, keepLoggedIn?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

/**
 * @description Maps a raw ApiError code from the login endpoint to a user-facing message.
 * @param apiError - Error rejected by the auth API client.
 */
function describeLoginError(apiError: ApiError): string {
  switch (apiError.code) {
    case 'ACCOUNT_LOCKED':
      return 'Your account is locked. Contact an administrator.';
    case 'ACCOUNT_INACTIVE':
      return 'Your account is inactive. Contact an administrator.';
    case 'NETWORK_ERROR':
      return 'Cannot reach the server. Check your connection and try again.';
    case 'TIMEOUT':
      return 'The server took too long to respond. Please try again.';
    case 'INVALID_CREDENTIALS':
      return 'Invalid username or password.';
    default:
      return 'Login failed. Please try again.';
  }
}

/**
 * @description Handles the medtech login/logout flow: validates input, exchanges credentials
 * for a session token, persists it, and routes to the queue (or back to login).
 */
export function useAuth(): UseAuthResult {
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const performLogin = useCallback(
    async (
      _signal: AbortSignal,
      username: string,
      password: string,
      keepLoggedIn: boolean,
    ): Promise<void> => {
      if (!username.trim() || !password.trim()) {
        throw new Error('Username and password are required.');
      }
      try {
        const data = await authApi.login(username, password);
        // Drop any session left over from a previous login, then choose where this one lives.
        await tokenStorage.clearAll();
        tokenStorage.setSessionOnly(!keepLoggedIn);
        await tokenStorage.saveToken(data.accessToken);
        await tokenStorage.saveUserInfo(data.userId, data.role, username);
        setAuthenticated(data.userId, data.role as UserRole, username);
        router.replace('/(medtech)/queue');
      } catch (err) {
        throw new Error(describeLoginError(err as ApiError));
      }
    },
    [setAuthenticated],
  );
  const { run: runLogin, isLoading: isSubmitting, error } = useAsyncAction('Auth', performLogin);

  const login = useCallback(
    async (username: string, password: string, keepLoggedIn = false): Promise<void> => {
      await runLogin(username, password, keepLoggedIn);
    },
    [runLogin],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // Continue logout even if the server call fails.
    } finally {
      await tokenStorage.clearAll();
      clearAuth();
      router.replace('/(auth)/login');
    }
  }, [clearAuth]);

  return { login, logout, isSubmitting, error: error?.message ?? null };
}
