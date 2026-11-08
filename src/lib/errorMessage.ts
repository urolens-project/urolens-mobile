/**
 * @description The message to show for a failed action. API failures reach callers as
 * plain `{ code, message }` objects (see the response interceptor in apiClient), not
 * `Error` instances, so `err instanceof Error` alone throws away the server's message
 * — e.g. "This specimen was rejected, so its result can't be confirmed" — and shows a
 * generic fallback instead.
 * @param err - Caught value of unknown shape.
 * @param fallback - Message to use when no usable message can be extracted.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  const message = (err as { message?: unknown } | null)?.message;
  return typeof message === 'string' && message ? message : fallback;
}
