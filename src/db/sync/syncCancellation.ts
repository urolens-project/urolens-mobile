/**
 * @description Stops obsolete sync work even when a transport completes after cancellation.
 * @param signal - Cancellation signal for the sync cycle, when one is provided.
 */
export function throwIfSyncCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error('Sync cancelled because local data is changing.');
  }
}
