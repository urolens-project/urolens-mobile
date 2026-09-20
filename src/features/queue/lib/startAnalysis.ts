import { database } from '@db/database';
import Specimen from '@db/models/Specimen';
import PendingSync from '@db/models/PendingSync';
import { apiClient } from '@lib/apiClient';
import { PendingSyncAction, PendingSyncStatus } from '@app-types/enums';

interface StartAnalysisParams {
  /** Local WatermelonDB id of the specimen. */
  specimenId: string;
  /** Server id — the specimen must already be synced. */
  serverId: string;
  isOnline: boolean;
}

// "Begin Analysis" is when a specimen becomes In Progress. The server owns
// specimen status (sync rule 1: server wins), so the change must reach it —
// otherwise the next pull sets the specimen back to ASSIGNED. Online, tell the
// server now; otherwise (or if that call fails) queue it for the next sync.
// The local status flips either way so the Queue badge updates immediately.
export async function startAnalysis({
  specimenId,
  serverId,
  isOnline,
}: StartAnalysisParams): Promise<void> {
  let needsQueueing = !isOnline;

  if (isOnline) {
    try {
      await apiClient.post(`/specimens/${serverId}/start-analysis`);
    } catch {
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
}
