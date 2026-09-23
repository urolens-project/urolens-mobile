import { database } from '@db/database';
import Specimen from '@db/models/Specimen';
import PendingSync from '@db/models/PendingSync';
import { isTransient } from '@db/sync/pushChanges';
import { apiClient } from '@lib/apiClient';
import { PendingSyncAction, PendingSyncStatus } from '@app-types/enums';
import type { ApiError } from '@app-types/domain';

interface StartAnalysisParams {
  /** Local WatermelonDB id of the specimen. */
  specimenId: string;
  /** Server id — the specimen must already be synced. */
  serverId: string;
  isOnline: boolean;
}

export type StartAnalysisResult =
  | { started: true }
  // The server understood the request and refused it (e.g. the specimen was rejected
  // or completed elsewhere). Nothing was changed on the device either.
  | { started: false; message: string };

const REFUSED_FALLBACK = 'The server would not start analysis for this specimen.';

// "Begin Analysis" is when a specimen becomes In Progress. The server owns
// specimen status (sync rule 1: server wins), so the change must reach it —
// otherwise the next pull sets the specimen back to ASSIGNED. Online, tell the
// server now; if it can't be reached — or there's no connection — queue it for the
// next sync and flip the local status so the Queue badge updates immediately.
//
// A server that *answers* with a refusal (4xx) is different: that isn't a hiccup to
// retry, it's the truth. Queueing it would replay the same refusal forever while the
// device showed a rejected specimen as In Progress, so it is reported instead.
export async function startAnalysis({
  specimenId,
  serverId,
  isOnline,
}: StartAnalysisParams): Promise<StartAnalysisResult> {
  let needsQueueing = !isOnline;

  if (isOnline) {
    try {
      await apiClient.post(`/specimens/${serverId}/start-analysis`);
    } catch (err) {
      if (!isTransient(err)) {
        return { started: false, message: (err as Partial<ApiError>)?.message ?? REFUSED_FALLBACK };
      }
      needsQueueing = true;
    }
  }

  await database.write(async () => {
    if (needsQueueing) {
      await database.get<PendingSync>('pending_sync').create((r) => {
        r.entity = 'specimens';
        r.entityId = serverId;
        r.action = PendingSyncAction.START_ANALYSIS;
        r.payloadJson = JSON.stringify({});
        r.status = PendingSyncStatus.PENDING;
        r.createdAt = Date.now();
      });
    }
    const specimen = await database.get<Specimen>('specimens').find(specimenId);
    await specimen.update((s) => {
      s.status = 'PROCESSING';
    });
  });

  return { started: true };
}
