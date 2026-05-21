import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import PendingSync from '../models/PendingSync';
import apiClient from '@lib/apiClient';
import { PendingSyncAction, PendingSyncStatus } from '@app-types/enums';

export async function pushChanges(): Promise<void> {
  const collection = database.get<PendingSync>('pending_sync');
  const pendingItems = await collection
    .query(Q.where('status', PendingSyncStatus.PENDING))
    .fetch();

  for (const item of pendingItems) {
    try {
      await dispatchAction(item);
      await item.update((record) => {
        (record as unknown as PendingSync).status = PendingSyncStatus.SYNCED;
        (record as unknown as PendingSync).attemptedAt = new Date().toISOString();
      });
    } catch (err) {
      console.error(`[pushChanges] Failed to sync action ${item.action} for ${item.entityId}:`, err);
      await item.update((record) => {
        (record as unknown as PendingSync).status = PendingSyncStatus.FAILED;
        (record as unknown as PendingSync).errorMessage =
          err instanceof Error ? err.message : String(err);
        (record as unknown as PendingSync).attemptedAt = new Date().toISOString();
      });
    }
  }
}

async function dispatchAction(item: PendingSync): Promise<void> {
  const payload = item.payload;

  switch (item.action as PendingSyncAction) {
    case PendingSyncAction.REJECT_SPECIMEN:
      await apiClient.post(`/specimens/${item.entityId}/reject`, payload);
      break;

    case PendingSyncAction.CONFIRM_RESULT:
      await apiClient.post(`/results/${item.entityId}/confirm`, payload);
      break;

    case PendingSyncAction.OVERRIDE_PARAMETER:
      await apiClient.post(`/results/${item.entityId}/override`, payload);
      break;

    case PendingSyncAction.DISCARD_IMAGE:
      await apiClient.post(`/images/${item.entityId}/discard`);
      break;

    default:
      throw new Error(`[pushChanges] Unknown sync action: ${item.action}`);
  }
}
