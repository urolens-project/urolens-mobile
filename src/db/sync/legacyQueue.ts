import AsyncStorage from '@react-native-async-storage/async-storage';
import { Q } from '@nozbe/watermelondb';
import { PendingSyncAction, PendingSyncStatus } from '@app-types/enums';

import { database } from '../database';
import type PendingSync from '../models/PendingSync';
import { throwIfSyncCancelled } from './syncCancellation';

const LEGACY_QUEUE_DRAINED_KEY = 'urolens_legacy_queue_drained_v1';

// Retired by the multi-field capture workflow: CONFIRM_RESULT and
// OVERRIDE_PARAMETER move to the web verification workspace, and
// DISCARD_IMAGE's route answers 410 APP_UPDATE_REQUIRED. A phone that queued
// one of these before updating would otherwise retry it forever against a
// route that will never again accept it.
const RETIRED_ACTIONS: PendingSyncAction[] = [
  PendingSyncAction.CONFIRM_RESULT,
  PendingSyncAction.OVERRIDE_PARAMETER,
  PendingSyncAction.DISCARD_IMAGE,
];

const RETIRED_REASON = 'Replaced by the field workflow. Continue this sample on the website.';

/**
 * @description One-time, run before the first sync of a new app version (SDD Module 2
 * proposal, section 8): marks any CONFIRM_RESULT, OVERRIDE_PARAMETER or DISCARD_IMAGE
 * still queued from before the multi-field capture workflow as FAILED, with a plain
 * reason, instead of letting it retry forever against a route that now refuses it.
 * Surfaces once on the Profile screen's existing failed-actions list — no separate
 * notice needed.
 * @param signal - Stops this drain when the account changes mid-sync.
 */
export async function drainLegacyQueuedActions(signal?: AbortSignal): Promise<void> {
  throwIfSyncCancelled(signal);
  const alreadyDrained = await AsyncStorage.getItem(LEGACY_QUEUE_DRAINED_KEY);
  throwIfSyncCancelled(signal);
  if (alreadyDrained) return;

  const retired = await database
    .get<PendingSync>('pending_sync')
    .query(
      Q.where('status', PendingSyncStatus.PENDING),
      Q.where('action', Q.oneOf(RETIRED_ACTIONS)),
    )
    .fetch();
  throwIfSyncCancelled(signal);

  if (retired.length > 0) {
    await database.write(async (): Promise<void> => {
      for (const item of retired) {
        throwIfSyncCancelled(signal);
        await item.update((record) => {
          const r = record as unknown as PendingSync;
          r.status = PendingSyncStatus.FAILED;
          r.errorMessage = RETIRED_REASON;
          r.attemptedAt = Date.now();
        });
      }
    });
  }
  throwIfSyncCancelled(signal);
  await AsyncStorage.setItem(LEGACY_QUEUE_DRAINED_KEY, '1');
}
