/**
 * @description Session idle-timeout timing, shared by the foreground warning modal
 * and the background-duration check. Mirrors web's useSessionTimeout (2-minute warning
 * before the configured timeout).
 */
export const SESSION_TIMEOUT_MINUTES = parseInt(
  process.env.EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES ?? '30',
  10,
);
export const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;

export const SESSION_WARNING_MINUTES = 2;
export const SESSION_WARNING_MS = SESSION_WARNING_MINUTES * 60 * 1000;
