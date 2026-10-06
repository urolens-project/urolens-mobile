import { useCallback, useEffect, useRef, useState } from 'react';

import { useIsAuthenticated } from '@lib/auth/authStore';

import {
  SESSION_TIMEOUT_MS,
  SESSION_WARNING_MINUTES,
  SESSION_WARNING_MS,
} from '../constants/sessionTimeout.constant';
import { getSessionTiming, type SessionTiming } from '../lib/sessionTiming';
import { useAuth } from './useAuth';

export interface UseSessionIdleTimerResult {
  isWarningVisible: boolean;
  notifyActivity: () => void;
  /** Minutes of inactivity left once the warning shows, for the modal's message. */
  warningMinutes: number;
}

// Used only until getSessionTiming() resolves (e.g. a tap in the first tick after
// authenticating) so an unset ref can never schedule a 0ms expiry.
const DEFAULT_TIMING: SessionTiming = {
  timeoutMs: SESSION_TIMEOUT_MS,
  warningMs: SESSION_WARNING_MS,
};

/**
 * @description Foreground idle timer, mirroring web's useSessionTimeout: warns the medtech
 * `idleWarningSeconds` before the role's `idleTimeoutMinutes` (from login/refresh) and signs
 * them out if no activity is reported before it elapses. Only runs while authenticated; any
 * call to `notifyActivity` (from a tap anywhere in the app, or the warning modal's button)
 * cancels the pending expiration and restarts the countdown.
 */
export function useSessionIdleTimer(): UseSessionIdleTimerResult {
  const isAuthenticated = useIsAuthenticated();
  const { logout } = useAuth();

  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [warningMinutes, setWarningMinutes] = useState(SESSION_WARNING_MINUTES);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Fetched once per authenticated session (idleTimeoutMinutes/idleWarningSeconds only
  // change at login or token refresh); `notifyActivity` fires on every tap and reads this
  // synchronously rather than re-reading storage each time.
  const timingRef = useRef<SessionTiming>(DEFAULT_TIMING);

  const clearTimers = useCallback((): void => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    warningTimerRef.current = null;
    expiryTimerRef.current = null;
  }, []);

  const resetTimer = useCallback((): void => {
    clearTimers();
    const { timeoutMs, warningMs } = timingRef.current;
    warningTimerRef.current = setTimeout(() => {
      setIsWarningVisible(true);
    }, timeoutMs - warningMs);
    expiryTimerRef.current = setTimeout(() => {
      void logout('inactivity');
    }, timeoutMs);
  }, [clearTimers, logout]);

  const notifyActivity = useCallback((): void => {
    setIsWarningVisible(false);
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      setIsWarningVisible(false);
      return;
    }
    let isCurrent = true;
    void getSessionTiming().then((timing) => {
      if (!isCurrent) return;
      timingRef.current = timing;
      setWarningMinutes(Math.round(timing.warningMs / 60_000));
      resetTimer();
    });
    return () => {
      isCurrent = false;
      clearTimers();
    };
  }, [isAuthenticated, resetTimer, clearTimers]);

  return { isWarningVisible: isAuthenticated && isWarningVisible, notifyActivity, warningMinutes };
}
