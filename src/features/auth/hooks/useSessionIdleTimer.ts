import { useCallback, useEffect, useRef, useState } from 'react';

import { useIsAuthenticated } from '@lib/auth/authStore';

import { SESSION_TIMEOUT_MS, SESSION_WARNING_MS } from '../constants/sessionTimeout.constant';
import { useAuth } from './useAuth';

export interface UseSessionIdleTimerResult {
  isWarningVisible: boolean;
  notifyActivity: () => void;
}

/**
 * @description Foreground idle timer, mirroring web's useSessionTimeout: warns the
 * medtech 2 minutes before the configured session timeout, and signs them out if no
 * activity is reported before it elapses. Only runs while authenticated; any call to
 * `notifyActivity` (from a tap anywhere in the app, or the warning modal's button)
 * cancels the pending expiration and restarts the countdown.
 */
export function useSessionIdleTimer(): UseSessionIdleTimerResult {
  const isAuthenticated = useIsAuthenticated();
  const { logout } = useAuth();

  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback((): void => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    warningTimerRef.current = null;
    expiryTimerRef.current = null;
  }, []);

  const resetTimer = useCallback((): void => {
    clearTimers();
    warningTimerRef.current = setTimeout(() => {
      setIsWarningVisible(true);
    }, SESSION_TIMEOUT_MS - SESSION_WARNING_MS);
    expiryTimerRef.current = setTimeout(() => {
      void logout('inactivity');
    }, SESSION_TIMEOUT_MS);
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
    resetTimer();
    return clearTimers;
  }, [isAuthenticated, resetTimer, clearTimers]);

  return { isWarningVisible: isAuthenticated && isWarningVisible, notifyActivity };
}
