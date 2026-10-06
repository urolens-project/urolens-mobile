import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { tokenStorage } from '@lib/auth/tokenStorage';

import { authApi } from '../api/authApi';

const REFRESH_BUFFER_MS = 60_000;

/**
 * @description Keeps the medtech's access token alive by calling POST /auth/refresh shortly
 * before it expires, as long as the app is active. An expired token can't be refreshed, so
 * this has to fire ahead of `expiresAt`, not after. Renders nothing; mount it once near the
 * authenticated app root, alongside SessionTimeoutHandler.
 */
export function TokenRefreshHandler(): null {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    let isCurrent = true;

    const clearTimer = (): void => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const refreshNow = async (): Promise<void> => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      try {
        const data = await authApi.refresh();
        if (!isCurrent) return;
        await tokenStorage.saveToken(data.accessToken);
        await tokenStorage.saveSessionMeta({
          expiresAt: data.expiresAt,
          sessionExpiresAt: data.sessionExpiresAt,
          idleTimeoutMinutes: data.idleTimeoutMinutes,
          idleWarningSeconds: data.idleWarningSeconds,
        });
        await scheduleFromStoredExpiry();
      } catch (err) {
        // A session that's actually over (expired/ended/idle) surfaces via apiClient's
        // 401 handler, which already clears auth and redirects to login with a reason.
        console.error('[TokenRefresh] failed to refresh token', err);
      } finally {
        isRefreshingRef.current = false;
      }
    };

    const scheduleFromStoredExpiry = async (): Promise<void> => {
      const meta = await tokenStorage.getSessionMeta();
      if (!isCurrent || !meta) return;
      clearTimer();
      const msUntilRefresh = new Date(meta.expiresAt).getTime() - Date.now() - REFRESH_BUFFER_MS;
      if (msUntilRefresh <= 0) {
        await refreshNow();
        return;
      }
      timerRef.current = setTimeout(() => void refreshNow(), msUntilRefresh);
    };

    void scheduleFromStoredExpiry();

    // Timers are unreliable while backgrounded (OS throttling/suspension); re-check
    // expiry whenever the app comes back to the foreground instead of trusting the
    // original timer alone.
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus): void => {
      if (nextState === 'active') void scheduleFromStoredExpiry();
    });

    return () => {
      isCurrent = false;
      clearTimer();
      subscription.remove();
    };
  }, []);

  return null;
}
