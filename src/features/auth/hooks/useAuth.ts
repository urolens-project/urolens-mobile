import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';

import { claimLocalDataFor } from '@db/sync/claimLocalData';
import { useAsyncAction } from '@hooks/useAsyncAction';
import { useAuthStore } from '@lib/auth/authStore';
import { tokenStorage } from '@lib/auth/tokenStorage';
import type { ApiError } from '@app-types/domain';
import type { UserRole } from '@app-types/enums';

import { authApi } from '../api/authApi';
import type { LogoutReason } from '../types';

export interface UseAuthResult {
  login: (username: string, password: string, keepLoggedIn?: boolean) => Promise<void>;
  logout: (reason?: LogoutReason) => Promise<void>;
  isSubmitting: boolean;
  /** True while a 429 TOO_MANY_LOGIN_ATTEMPTS lockout from the last attempt is in effect. */
  isLocked: boolean;
  error: string | null;
}

/**
 * @description Maps a raw ApiError code from the login endpoint to a user-facing message.
 * Codes the backend already writes a specific, user-safe message for (account locked, role
 * not allowed, rate limited) are shown as-is rather than re-worded on the client.
 * @param apiError - Error rejected by the auth API client.
 */
function describeLoginError(apiError: ApiError): string {
  if (apiError.status !== undefined && apiError.status >= 500) {
    return 'The server could not complete login. Please try again later.';
  }

  switch (apiError.code) {
    case 'ACCOUNT_LOCKED':
    case 'ROLE_NOT_ALLOWED':
    case 'TOO_MANY_LOGIN_ATTEMPTS':
      return apiError.message;
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

  const [isLocked, setIsLocked] = useState(false);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    },
    [],
  );

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
        const data = await authApi.login(username, password, keepLoggedIn);
        // Before anything is saved or shown: never let this user see or send another
        // user's local data.
        await claimLocalDataFor(data.userId);
        // Drop any session left over from a previous login, then choose where this one lives.
        await tokenStorage.clearAll();
        tokenStorage.setSessionOnly(!keepLoggedIn);
        await tokenStorage.saveToken(data.accessToken);
        await tokenStorage.saveUserInfo(data.userId, data.role, username);
        await tokenStorage.saveSessionMeta({
          expiresAt: data.expiresAt,
          sessionExpiresAt: data.sessionExpiresAt,
          idleTimeoutMinutes: data.idleTimeoutMinutes,
          idleWarningSeconds: data.idleWarningSeconds,
        });
        setAuthenticated(data.userId, data.role as UserRole, username);
        router.replace('/(medtech)/queue');
      } catch (err) {
        const apiError = err as ApiError;
        const retryAfterSeconds = apiError.details?.retryAfterSeconds;
        if (apiError.code === 'TOO_MANY_LOGIN_ATTEMPTS' && typeof retryAfterSeconds === 'number') {
          setIsLocked(true);
          if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
          lockTimerRef.current = setTimeout(() => setIsLocked(false), retryAfterSeconds * 1000);
        }
        throw new Error(describeLoginError(apiError));
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

  const logout = useCallback(
    async (reason?: LogoutReason): Promise<void> => {
      try {
        await authApi.logout(reason === 'inactivity' ? 'INACTIVITY' : undefined);
      } catch {
        // Continue logout even if the server call fails.
      } finally {
        await tokenStorage.clearAll();
        clearAuth();
        router.replace(
          reason ? { pathname: '/(auth)/login', params: { reason } } : '/(auth)/login',
        );
      }
    },
    [clearAuth],
  );

  return { login, logout, isSubmitting, isLocked, error: error?.message ?? null };
}
