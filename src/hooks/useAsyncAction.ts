import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseAsyncActionResult<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult | undefined>;
  isLoading: boolean;
  error: Error | null;
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
  const [error, setError] = useState<Error | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setIsLoading(true);
      setError(null);
      try {
        return await action(controller.signal, ...args);
      } catch (err: unknown) {
        if (controller.signal.aborted) return undefined;
        console.error(`[${tag}]`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
        return undefined;
      } finally {
        if (controllerRef.current === controller) setIsLoading(false);
      }
    },
    [tag, action],
  );

  return { run, isLoading, error };
}
