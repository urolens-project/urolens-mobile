import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';

import { claimLocalDataFor } from '@db/sync/claimLocalData';
import { useAsyncAction } from '@hooks/useAsyncAction';
import { useAuthStore } from '@lib/auth/authStore';
import { tokenStorage } from '@lib/auth/tokenStorage';
import type { ApiError } from '@app-types/domain';
import type { UserRole } from '@app-types/enums';

import { authApi } from '../api/authApi';
import { AUTH_TEXT } from '../constants/authText.constant';
import type { LogoutReason } from '../types';

export interface UseAuthResult {
  login: (username: string, password: string, keepLoggedIn?: boolean) => Promise<void>;
  logout: (reason?: LogoutReason) => Promise<void>;
  isSubmitting: boolean;
  /** Seconds left in an active login lockout (423 ACCOUNT_LOCKED or 429
   * TOO_MANY_LOGIN_ATTEMPTS with a retry-after). Ticks down live to 0 every second;
   * does not block submitting — the next attempt simply keeps failing until it hits 0. */
  lockoutSecondsRemaining: number;
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
    return AUTH_TEXT.loginErrorMessages.serverError;
  }

  switch (apiError.code) {
    case 'ACCOUNT_LOCKED':
    case 'ROLE_NOT_ALLOWED':
    case 'TOO_MANY_LOGIN_ATTEMPTS':
      return apiError.message;
    case 'ACCOUNT_INACTIVE':
      return AUTH_TEXT.loginErrorMessages.accountInactive;
    case 'NETWORK_ERROR':
      return AUTH_TEXT.loginErrorMessages.networkError;
    case 'TIMEOUT':
      return AUTH_TEXT.loginErrorMessages.timeout;
    case 'INVALID_CREDENTIALS':
      return AUTH_TEXT.loginErrorMessages.invalidCredentials;
    default:
      return AUTH_TEXT.loginErrorMessages.default;
  }
}

/**
 * @description Handles the medtech login/logout flow: validates input, exchanges credentials
 * for a session token, persists it, and routes to the queue (or back to login).
 */
export function useAuth(): UseAuthResult {
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [lockoutSecondsRemaining, setLockoutSecondsRemaining] = useState(0);
  const lockoutIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockedUntilRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (lockoutIntervalRef.current) clearInterval(lockoutIntervalRef.current);
    },
    [],
  );

  /**
   * @description Starts (or restarts) a live, ticking countdown to a login lockout's
   * expiry, driven by wall-clock time rather than a tick count so backgrounding the
   * app doesn't leave the countdown running fast or slow once it resumes.
   * @param seconds - Server-reported retry-after window, in seconds.
   */
  const startLockoutCountdown = useCallback((seconds: number): void => {
    lockedUntilRef.current = Date.now() + seconds * 1000;
    if (lockoutIntervalRef.current) clearInterval(lockoutIntervalRef.current);

    const tick = (): void => {
      const remaining = Math.max(0, Math.ceil(((lockedUntilRef.current ?? 0) - Date.now()) / 1000));
      setLockoutSecondsRemaining(remaining);
      if (remaining <= 0 && lockoutIntervalRef.current) {
        clearInterval(lockoutIntervalRef.current);
        lockoutIntervalRef.current = null;
      }
    };
    tick();
    lockoutIntervalRef.current = setInterval(tick, 1000);
  }, []);

  const performLogin = useCallback(
    async (
      _signal: AbortSignal,
      username: string,
      password: string,
      keepLoggedIn: boolean,
    ): Promise<void> => {
      if (!username.trim() || !password.trim()) {
        throw new Error(AUTH_TEXT.loginRequiredFieldsError);
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
        if (
          (apiError.code === 'TOO_MANY_LOGIN_ATTEMPTS' || apiError.code === 'ACCOUNT_LOCKED') &&
          typeof retryAfterSeconds === 'number'
        ) {
          startLockoutCountdown(retryAfterSeconds);
        }
        throw new Error(describeLoginError(apiError));
      }
    },
    [setAuthenticated, startLockoutCountdown],
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

  return { login, logout, isSubmitting, lockoutSecondsRemaining, error: error?.message ?? null };
}
