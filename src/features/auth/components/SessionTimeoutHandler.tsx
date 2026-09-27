import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '../hooks/useAuth';

const TIMEOUT_MS =
  parseInt(process.env.EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES ?? '30', 10) * 60 * 1000;

/**
 * @description Logs the medtech out if the app was backgrounded longer than the
 * configured session timeout. Renders nothing; mount it once near the app root.
 */
export function SessionTimeoutHandler(): null {
  const backgroundTime = useRef<number | null>(null);
  const { logout } = useAuth();

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus): Promise<void> => {
        if (nextState === 'background' || nextState === 'inactive') {
          backgroundTime.current = Date.now();
        } else if (nextState === 'active' && backgroundTime.current !== null) {
          const elapsed = Date.now() - backgroundTime.current;
          if (elapsed >= TIMEOUT_MS) {
            await logout();
          }
          backgroundTime.current = null;
        }
      },
    );
    return () => subscription.remove();
  }, [logout]);

  return null;
}
