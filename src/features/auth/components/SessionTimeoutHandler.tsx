import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { tokenStorage } from '@lib/auth/tokenStorage';

import { SESSION_TIMEOUT_MS } from '../constants/sessionTimeout.constant';
import { useAuth } from '../hooks/useAuth';

/**
 * @description Logs the medtech out if the app was backgrounded (or killed and
 * relaunched) longer than the configured session timeout. Renders nothing; mount it
 * once near the app root, inside the authenticated route group.
 */
export function SessionTimeoutHandler(): null {
  const { logout } = useAuth();

  const backgroundTime = useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus): Promise<void> => {
        // iOS also becomes inactive during system interruptions such as Face ID,
        // Notification Center, or incoming calls. Only time actual backgrounding.
        if (nextState === 'background') {
          backgroundTime.current = Date.now();
          // Persisted (not just in-memory) so a cold start after the app was fully
          // killed can still tell how long the medtech was away.
          await tokenStorage.saveLastActiveAt(backgroundTime.current);
        } else if (nextState === 'active' && backgroundTime.current !== null) {
          const elapsed = Date.now() - backgroundTime.current;
          backgroundTime.current = null;
          if (elapsed >= SESSION_TIMEOUT_MS) {
            await logout('inactivity');
          } else {
            await tokenStorage.removeLastActiveAt();
          }
        }
      },
    );
    return () => subscription.remove();
  }, [logout]);

  return null;
}
