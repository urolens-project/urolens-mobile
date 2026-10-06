import { Q } from '@nozbe/watermelondb';

import { database } from '@db/database';
import type AnalysisResult from '@db/models/AnalysisResult';
import type Specimen from '@db/models/Specimen';
import type PendingSync from '@db/models/PendingSync';
import { latestAnalysisResultsBySpecimen } from '@db/latestAnalysisResultsBySpecimen';
import { authStoreApi } from '@lib/auth/authStore';
import { PendingSyncAction, PendingSyncStatus } from '@app-types/enums';

import type { RejectionReceipt, SpecimenRejectRequest } from '../types';
import { getRejectionEligibilityMessage } from './rejectionEligibility';

/**
 * @description Saves the rejection and any offline outbox entry together so a partial write cannot lose queued work.
 * @param specimen - Specimen being rejected.
 * @param payload - Reason and note accepted or queued for the server.
 * @param receipt - Rejection timestamp and server identifier.
 * @param isQueued - Whether the rejection still needs to be submitted during sync.
 */
export async function persistRejection(
  specimen: Specimen,
  payload: SpecimenRejectRequest,
  receipt: RejectionReceipt,
  isQueued: boolean,
): Promise<void> {
  await database.write(async (): Promise<void> => {
    if (isQueued) {
      const results = await database
        .get<AnalysisResult>('analysis_results')
        .query(Q.where('specimen_id', receipt.specimenId))
        .fetch();
      const resultStatus =
        latestAnalysisResultsBySpecimen(results).get(receipt.specimenId)?.status ?? null;
      const blockedReason = getRejectionEligibilityMessage(
        specimen,
        authStoreApi.getUserId(),
        resultStatus,
      );
      if (blockedReason) throw new Error(blockedReason);
    }
    const rawBeforeUpdate = { ...specimen._raw };
    try {
      const pending = isQueued
        ? database.get<PendingSync>('pending_sync').prepareCreate((record): void => {
            record.entity = 'specimens';
            record.entityId = receipt.specimenId;
            record.action = PendingSyncAction.REJECT_SPECIMEN;
            record.payloadJson = JSON.stringify(payload);
            record.status = PendingSyncStatus.PENDING;
            record.createdAt = Date.now();
          })
        : null;
      const update = specimen.prepareUpdate((record): void => {
        record.status = 'REJECTED';
        record.rejectionReason = payload.reasonCode;
        record.rejectionNote = payload.freeTextNote ?? null;
        record.rejectedAt = receipt.rejectedAt;
      });
      await database.batch(update, pending);
    } catch (error: unknown) {
      // WatermelonDB mutates its cached raw record before the adapter commits.
      // Restore it on failure so retry checks see the last committed status.
      specimen._raw = rawBeforeUpdate;
      specimen._preparedState = null;
      throw error;
    }
  });
}
