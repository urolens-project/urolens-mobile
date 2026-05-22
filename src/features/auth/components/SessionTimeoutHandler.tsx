import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../hooks/useAuth';

const TIMEOUT_MS =
  parseInt(process.env.EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES ?? '30') * 60 * 1000;

export function SessionTimeoutHandler() {
  const backgroundTime = useRef<number | null>(null);
  const { logout } = useAuth();

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus) => {
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
