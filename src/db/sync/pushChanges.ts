import { Q } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@lib/apiClient';
import { PendingSyncAction, PendingSyncStatus } from '@app-types/enums';

import { database } from '../database';
import type PendingSync from '../models/PendingSync';
import { throwIfSyncCancelled } from './syncCancellation';

// A change that keeps failing for a transient reason is retried on every sync for
// this long, then given up on (marked FAILED) so it can't sit in the queue forever.
const MAX_RETRY_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Actions marked FAILED before retries existed were never given a second chance.
// They get exactly one, recorded under this key.
const LEGACY_REQUEUE_KEY = 'urolens_failed_actions_requeued_v1';

// Replies that mean "this already happened on the server": the change is done, not failed.
// (Bare 'CONFLICT' is the generic 409; the others are what the backend actually sends.)
const ALREADY_DONE_CODES = new Set([
  'CONFLICT',
  'SPECIMEN_ALREADY_REJECTED',
  'RESULT_ALREADY_CONFIRMED',
]);

interface PushError {
  code?: string;
  status?: number;
  message?: string;
}

export interface PushSummary {
  /** Changes given up on in this run: the phone still shows them as done, the server never applied them. */
  refusedCount: number;
}

/**
 * @description Worth trying again later: the request never got a proper answer (no
 * network, timeout), the server had a problem (5xx), it asked us to slow down
 * (429/408), or the session needs a fresh login (401). Anything else — the server
 * understood and refused (validation, permission, wrong state) — will fail the same
 * way again.
 * @param err - Caught value from a failed push.
 */
export function isTransient(err: unknown): boolean {
  const { code, status } = (err ?? {}) as PushError;
  if (code === 'NETWORK_ERROR' || code === 'TIMEOUT') return true;
  if (status === undefined) return false;
  return status === 401 || status === 408 || status === 429 || status >= 500;
}

// API errors are plain objects, not Error instances — String(err) would be "[object Object]".
function describeError(err: unknown): string {
  const { code, message } = (err ?? {}) as PushError;
  if (code && message) return `${code}: ${message}`;
  if (err instanceof Error) return err.message;
  return message ?? code ?? 'Unknown error';
}

async function markItem(
  item: PendingSync,
  status: PendingSyncStatus,
  errorMessage?: string,
  signal?: AbortSignal,
): Promise<void> {
  throwIfSyncCancelled(signal);
  await database.write(async (): Promise<void> => {
    throwIfSyncCancelled(signal);
    await item.update((record) => {
      const r = record as unknown as PendingSync;
      r.status = status;
      r.attemptedAt = Date.now();
      if (errorMessage !== undefined) r.errorMessage = errorMessage;
    });
  });
}

/** @description True while any change is still waiting to be sent to the server. */
export async function hasPendingActions(): Promise<boolean> {
  const count = await database
    .get<PendingSync>('pending_sync')
    .query(Q.where('status', PendingSyncStatus.PENDING))
    .fetchCount();
  return count > 0;
}

/**
 * @description One-time: gives actions that were FAILED under the old never-retry
 * behavior a second chance. Ones that fail again for a permanent reason go back to FAILED.
 * @param signal - Stops legacy retry bookkeeping when the account changes.
 */
export async function requeueLegacyFailedActions(signal?: AbortSignal): Promise<void> {
  throwIfSyncCancelled(signal);
  const wasRequeued = await AsyncStorage.getItem(LEGACY_REQUEUE_KEY);
  throwIfSyncCancelled(signal);
  if (wasRequeued) return;

  const failed = await database
    .get<PendingSync>('pending_sync')
    .query(Q.where('status', PendingSyncStatus.FAILED))
    .fetch();
  throwIfSyncCancelled(signal);
  const cutoff = Date.now() - MAX_RETRY_AGE_MS;
  const recent = failed.filter((item) => item.createdAt >= cutoff);

  if (recent.length > 0) {
    await database.write(async (): Promise<void> => {
      for (const item of recent) {
        throwIfSyncCancelled(signal);
        await item.update((record) => {
          (record as unknown as PendingSync).status = PendingSyncStatus.PENDING;
        });
      }
    });
  }
  throwIfSyncCancelled(signal);
  await AsyncStorage.setItem(LEGACY_REQUEUE_KEY, '1');
}

/**
 * @description Sends every pending local change to the server in creation order,
 * retrying transient failures on the next sync and giving up (FAILED) on permanent
 * ones or once MAX_RETRY_AGE_MS has passed. Reports how many it gave up on, so the
 * caller can put the phone back in step with the server (see syncManager).
 * @param signal - Stops requests and pending-action updates when the account changes.
 */
export async function pushChanges(signal?: AbortSignal): Promise<PushSummary> {
  throwIfSyncCancelled(signal);
  const collection = database.get<PendingSync>('pending_sync');
  // Oldest first, so changes reach the server in the order they were made
  // (e.g. Begin Analysis before Confirm).
  const pendingItems = await collection
    .query(Q.where('status', PendingSyncStatus.PENDING), Q.sortBy('created_at', Q.asc))
    .fetch();
  throwIfSyncCancelled(signal);
  let refusedCount = 0;

  for (const item of pendingItems) {
    throwIfSyncCancelled(signal);
    try {
      await dispatchAction(item, signal);
      await markItem(item, PendingSyncStatus.SYNCED, undefined, signal);
    } catch (err) {
      // An intentional cancellation must leave this action pending, rather than
      // record a permanent failure or send the next action under another session.
      throwIfSyncCancelled(signal);
      const { code } = (err ?? {}) as PushError;
      if (code && ALREADY_DONE_CODES.has(code)) {
        await markItem(item, PendingSyncStatus.SYNCED, undefined, signal);
        continue;
      }

      const message = describeError(err);
      const expired = Date.now() - item.createdAt > MAX_RETRY_AGE_MS;

      if (isTransient(err) && !expired) {
        // Stay PENDING: the next sync tries again.
        console.warn(
          `[pushChanges] ${item.action} for ${item.entityId} will be retried: ${message}`,
        );
        await markItem(item, PendingSyncStatus.PENDING, message, signal);
      } else {
        console.error(`[pushChanges] ${item.action} for ${item.entityId} failed: ${message}`);
        await markItem(item, PendingSyncStatus.FAILED, message, signal);
        refusedCount += 1;
      }
    }
  }
  return { refusedCount };
}

async function dispatchAction(item: PendingSync, signal?: AbortSignal): Promise<void> {
  const payload = item.payload;

  switch (item.action as PendingSyncAction) {
    case PendingSyncAction.REJECT_SPECIMEN:
      await apiClient.post(`/specimens/${item.entityId}/reject`, payload, { signal });
      break;

    case PendingSyncAction.START_ANALYSIS:
      await apiClient.post(`/specimens/${item.entityId}/start-analysis`, undefined, { signal });
      break;

    case PendingSyncAction.CONFIRM_RESULT:
      await apiClient.post(`/results/${item.entityId}/confirm`, payload, { signal });
      break;

    case PendingSyncAction.OVERRIDE_PARAMETER:
      await apiClient.post(`/results/${item.entityId}/override`, payload, { signal });
      break;

    case PendingSyncAction.DISCARD_IMAGE:
      await apiClient.post(`/images/${item.entityId}/discard`, undefined, { signal });
      break;

    default:
      throw new Error(`[pushChanges] Unknown sync action: ${item.action}`);
  }
}
