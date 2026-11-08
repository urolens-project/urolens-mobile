import { useCallback, useEffect, useRef, useState } from 'react';

export type ActionError = Error & { code?: string; details?: Record<string, unknown> };

export interface UseAsyncActionResult<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult | undefined>;
  isLoading: boolean;
  error: ActionError | null;
  /** Reads the error set by the most recently settled `run()` call, bypassing the
   * render closure — `error` state lags one render behind inside a just-awaited
   * `run()` caller, since React hasn't re-rendered yet when the promise resolves. */
  getError: () => ActionError | null;
}

/** API errors (@app-types/domain ApiError) are plain `{ code, message }` objects,
 * not Error instances — stringifying them with `String(err)` yields "[object Object]". */
function toActionError(err: unknown): ActionError {
  if (err instanceof Error) return err;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const { message, code, details } = err as {
      message: unknown;
      code?: unknown;
      details?: unknown;
    };
    const error: ActionError = new Error(String(message));
    if (typeof code === 'string') error.code = code;
    // e.g. FIELDS_UNDECIDED's undecidedFields, which the field list checks against its own rows.
    if (typeof details === 'object' && details !== null) {
      error.details = details as Record<string, unknown>;
    }
    return error;
  }
  return new Error(String(err));
}

/**
 * @description Wraps an async action so callers never toggle loading state by hand.
 * Aborts the previous in-flight call when a new one starts, and logs and exposes errors.
 * @param tag - Log prefix identifying the caller, e.g. 'Queue'.
 * @param action - Async function receiving an AbortSignal as its first argument.
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  tag: string,
  action: (signal: AbortSignal, ...args: TArgs) => Promise<TResult>,
): UseAsyncActionResult<TArgs, TResult> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const errorRef = useRef<ActionError | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setIsLoading(true);
      errorRef.current = null;
      setError(null);
      try {
        return await action(controller.signal, ...args);
      } catch (err: unknown) {
        if (controller.signal.aborted) return undefined;
        console.error(`[${tag}]`, err);
        const actionError = toActionError(err);
        errorRef.current = actionError;
        setError(actionError);
        return undefined;
      } finally {
        if (controllerRef.current === controller) setIsLoading(false);
      }
    },
    [tag, action],
  );

  const getError = useCallback((): ActionError | null => errorRef.current, []);

  return { run, isLoading, error, getError };
}
