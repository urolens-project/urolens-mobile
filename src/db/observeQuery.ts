import type { Query, Model } from '@nozbe/watermelondb';

const RESET_ERROR_SNIPPET = 'being reset';
const RETRY_DELAY_MS = 150;

/**
 * Subscribes to a WatermelonDB reactive query, transparently retrying if the
 * subscription happens to land exactly while database.unsafeResetDatabase()
 * (run once by syncManager, on the very first sync after install) is
 * mid-flight. WatermelonDB throws ("Cannot call database.adapter
 * .underlyingAdapter while the database is being reset") instead of queuing
 * in that narrow window, which otherwise crashes any screen whose queries
 * happen to (re-)subscribe at that moment. Any other error is logged, not
 * retried — this is only meant to paper over that one specific race.
 */
export function observeQuery<T extends Model>(
  query: Query<T>,
  onData: (rows: T[]) => void,
): { unsubscribe: () => void } {
  let cancelled = false;
  let inner: { unsubscribe: () => void } | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  function start() {
    inner = query.observe().subscribe(onData, (err: unknown) => {
      if (cancelled) return;
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes(RESET_ERROR_SNIPPET)) {
        retryTimer = setTimeout(start, RETRY_DELAY_MS);
        return;
      }
      console.error('[observeQuery] subscription error:', err);
    });
  }

  start();

  return {
    unsubscribe: () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      inner?.unsubscribe();
    },
  };
}
