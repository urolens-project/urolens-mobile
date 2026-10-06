import type { Query, Model } from '@nozbe/watermelondb';

const RESET_ERROR_SNIPPET = 'being reset';
const RETRY_DELAY_MS = 150;

export interface Unsubscribable {
  unsubscribe: () => void;
}

interface ObserveQueryOptions {
  columns?: string[];
  onError?: (error: Error) => void;
}

/**
 * @description Subscribes to a WatermelonDB reactive query, transparently retrying if
 * the subscription happens to land exactly while database.unsafeResetDatabase() (run
 * once by syncManager, on the very first sync after install) is mid-flight.
 * WatermelonDB throws ("Cannot call database.adapter.underlyingAdapter while the
 * database is being reset") instead of queuing in that narrow window, which otherwise
 * crashes any screen whose queries happen to (re-)subscribe at that moment. Any other
 * error is logged, not retried — this is only meant to paper over that one specific race.
 * @param query - Reactive WatermelonDB query to observe.
 * @param onData - Called with the current rows on every emission.
 * @param options - Columns to watch for in-place updates and a terminal error handler.
 */
export function observeQuery<T extends Model>(
  query: Query<T>,
  onData: (rows: T[]) => void,
  options: ObserveQueryOptions = {},
): Unsubscribable {
  let cancelled = false;
  let inner: Unsubscribable | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  function start(): void {
    const observable = options.columns
      ? query.observeWithColumns(options.columns)
      : query.observe();
    inner = observable.subscribe(onData, (err: unknown): void => {
      if (cancelled) return;
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes(RESET_ERROR_SNIPPET)) {
        retryTimer = setTimeout(start, RETRY_DELAY_MS);
        return;
      }
      console.error('[observeQuery] subscription error:', err);
      options.onError?.(err instanceof Error ? err : new Error(message));
    });
  }

  start();

  return {
    unsubscribe: (): void => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      inner?.unsubscribe();
    },
  };
}
