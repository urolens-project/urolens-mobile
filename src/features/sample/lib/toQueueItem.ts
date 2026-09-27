import type Specimen from '@db/models/Specimen';
import type { QueueItem } from '@features/queue/types';

/**
 * @description Adapts a Specimen model to the Queue's QueueItem shape so the sample
 * detail screen can reuse Queue's status/action helpers. Doesn't derive
 * isReturnedForCorrection here — the screen reads the loaded analysis result directly.
 * @param s - WatermelonDB Specimen model instance.
 */
export function toQueueItem(s: Specimen): QueueItem {
  return {
    id: s.id,
    serverId: s.serverId,
    sampleUid: s.sampleUid,
    patientName: s.patientName,
    patientUid: s.patientUid,
    testType: s.testType,
    status: s.status as QueueItem['status'],
    priorityLevel: s.priorityLevel as QueueItem['priorityLevel'],
    receivedAt: s.receivedAt,
    medtechId: s.medtechId,
    rejectionReason: s.rejectionReason,
    rejectionNote: s.rejectionNote,
    rejectedAt: s.rejectedAt,
    syncedAt: s.syncedAt,
    isReturnedForCorrection: false,
  };
}
