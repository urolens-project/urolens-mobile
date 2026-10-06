import { Q } from '@nozbe/watermelondb';
import type { Query } from '@nozbe/watermelondb';

import { PendingSyncStatus } from '@app-types/enums';

import { database } from '../database';
import AnalysisResult from '../models/AnalysisResult';
import PendingSync from '../models/PendingSync';
import Specimen from '../models/Specimen';

/**
 * @description The queued changes the server refused (or that expired) and the MedTech
 * hasn't dismissed yet, newest first. Observe it to keep a count or a list current.
 */
export function failedActionsQuery(): Query<PendingSync> {
  return database
    .get<PendingSync>('pending_sync')
    .query(Q.where('status', PendingSyncStatus.FAILED), Q.sortBy('created_at', Q.desc));
}

/**
 * @description Clears the refused changes from the MedTech's list. They are kept, marked
 * DISMISSED, not deleted: nothing can be done with them, but they stay on record.
 */
export async function dismissFailedActions(): Promise<void> {
  const failed = await failedActionsQuery().fetch();
  if (failed.length === 0) return;
  await database.write(async () => {
    for (const item of failed) {
      await item.update((record) => {
        record.status = PendingSyncStatus.DISMISSED;
      });
    }
  });
}

/**
 * @description The sample a refused change was about, as the MedTech knows it (its
 * sample ID), or null when it can't be worked out — the sample is no longer on the
 * phone, or the change was about an image.
 * @param item - The refused change.
 */
export async function findSampleUid(item: PendingSync): Promise<string | null> {
  if (item.entity === 'specimens') return sampleUidOf(item.entityId);
  if (item.entity === 'analysis_results' || item.entity === 'manual_override') {
    const [result] = await database
      .get<AnalysisResult>('analysis_results')
      .query(byServerOrLocalId(item.entityId))
      .fetch();
    return result ? sampleUidOf(result.specimenId) : null;
  }
  return null;
}

async function sampleUidOf(specimenId: string): Promise<string | null> {
  const [specimen] = await database
    .get<Specimen>('specimens')
    .query(byServerOrLocalId(specimenId))
    .fetch();
  return specimen?.sampleUid || null;
}

// Queued changes name a record by its server id when it has one, else its local id.
function byServerOrLocalId(id: string): Q.Or {
  return Q.or(Q.where('server_id', id), Q.where('id', id));
}
