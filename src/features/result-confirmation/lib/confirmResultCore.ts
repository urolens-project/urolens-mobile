import { database } from '@db/database';
import AnalysisResult from '@db/models/AnalysisResult';
import PendingSync from '@db/models/PendingSync';
import { apiClient } from '@lib/apiClient';
import { synchronize } from '@db/sync/syncManager';
import { PendingSyncAction, PendingSyncStatus, ResultStatus } from '@app-types/enums';
import type { ApiError } from '@app-types/domain';

interface ConfirmResultParams {
  result: AnalysisResult;
  isOnline: boolean;
}

// Single source of truth for "confirm a result" — used by both the post-capture
// review screen and the queue-revisit screen so their behavior can't drift apart.
export async function confirmResultCore({ result, isOnline }: ConfirmResultParams): Promise<void> {
  const serverId = result.serverId;

  if (isOnline && serverId) {
    try {
      await apiClient.post(`/results/${serverId}/confirm`, {});
    } catch (err) {
      // 409 RESULT_ALREADY_CONFIRMED = already confirmed (double-tap or retry
      // after a request that succeeded server-side but errored on the client).
      // Treat as success: fall through to sync + local update.
      if ((err as ApiError)?.code !== 'RESULT_ALREADY_CONFIRMED') throw err;
    }
    // Pull smart_diagnosis immediately so the panel renders without waiting
    // for the next periodic sync.
    await synchronize();
  } else {
    await database.write(async () => {
      await database.get<PendingSync>('pending_sync').create((r) => {
        r.entity = 'analysis_results';
        r.entityId = serverId ?? result.id;
        r.action = PendingSyncAction.CONFIRM_RESULT;
        r.payloadJson = JSON.stringify({});
        r.status = PendingSyncStatus.PENDING;
        r.createdAt = Date.now();
      });
    });
  }

  await database.write(async () => {
    await result.update((r) => {
      r.status = ResultStatus.PENDING_SUPERVISOR_APPROVAL;
      r.isSynced = isOnline && !!serverId;
    });
  });
}
