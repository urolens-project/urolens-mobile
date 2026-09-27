import { useSyncExternalStore } from 'react';
import { getSyncStatus, subscribeSyncStatus } from '@db/sync/syncManager';
import type { SyncStatus } from '@db/sync/syncManager';

/** @description The outcome of the most recent sync, from any screen that started it. */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSyncStatus, getSyncStatus);
}
