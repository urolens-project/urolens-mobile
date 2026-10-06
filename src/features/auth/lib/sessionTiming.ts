import { tokenStorage } from '@lib/auth/tokenStorage';

import { SESSION_TIMEOUT_MS, SESSION_WARNING_MS } from '../constants/sessionTimeout.constant';

export interface SessionTiming {
  /** How long the session may go without activity before it's signed out, in ms. */
  timeoutMs: number;
  /** How long before the timeout the "expiring soon" warning should show, in ms. */
  warningMs: number;
}

/**
 * @description Resolves the idle-timeout and warning durations for the current session.
 * The backend sends `idleTimeoutMinutes`/`idleWarningSeconds` with login and refresh
 * (MedTechs get 60 minutes, other roles 30) and they're persisted alongside the token; this
 * falls back to the app's built-in defaults only when no session is stored yet.
 */
export async function getSessionTiming(): Promise<SessionTiming> {
  const meta = await tokenStorage.getSessionMeta();
  if (!meta) {
    return { timeoutMs: SESSION_TIMEOUT_MS, warningMs: SESSION_WARNING_MS };
  }
  return {
    timeoutMs: meta.idleTimeoutMinutes * 60_000,
    warningMs: meta.idleWarningSeconds * 1000,
  };
}
