import { useCallback, useRef, useState } from 'react';
import { Q } from '@nozbe/watermelondb';

import { database } from '@db/database';
import type AnalysisResult from '@db/models/AnalysisResult';
import type Specimen from '@db/models/Specimen';
import { latestAnalysisResultsBySpecimen } from '@db/latestAnalysisResultsBySpecimen';
import { useAsyncAction } from '@hooks/useAsyncAction';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { authStoreApi } from '@lib/auth/authStore';
import { getErrorMessage } from '@lib/errorMessage';
import { RejectionReason } from '@app-types/enums';

import { specimenRejectionApi } from '../api/specimenRejectionApi';
import { MAX_REJECTION_NOTE_LENGTH } from '../constants/specimenRejection.constant';
import { getRejectionEligibilityMessage } from '../lib/rejectionEligibility';
import { persistRejection } from '../lib/persistRejection';
import { mapRejectionToReceipt } from '../mappers/specimenRejection.mapper';
import type { RejectResult, RejectionReceipt, SpecimenRejectRequest } from '../types';

export type { RejectResult } from '../types';

export interface UseRejectSpecimenResult {
  reject: (reason: RejectionReason, note?: string) => Promise<RejectResult>;
  isLoading: boolean;
  hasAcceptedRejection: boolean;
}

interface AcceptedRejection {
  localSpecimenId: string;
  userId: string | null;
  payload: SpecimenRejectRequest;
  receipt: RejectionReceipt;
}

/**
 * @description Rejects an assigned specimen, atomically saving offline work and preventing duplicate submissions.
 * @param specimenId - Local specimen identifier.
 */
export function useRejectSpecimen(specimenId: string): UseRejectSpecimenResult {
  const { isOnline } = useNetworkStatus();
  const [hasAcceptedRejection, setHasAcceptedRejection] = useState(false);
  const isSubmittingRef = useRef(false);
  const acceptedRef = useRef<AcceptedRejection | null>(null);

  const action = useCallback(
    async (signal: AbortSignal, reason: RejectionReason, note = ''): Promise<RejectResult> => {
      try {
        const specimen = await database.get<Specimen>('specimens').find(specimenId);
        const userId = authStoreApi.getUserId();
        const accepted = acceptedRef.current;
        if (accepted) {
          if (accepted.localSpecimenId !== specimenId || accepted.userId !== userId) {
            throw new Error('Return to the queue to refresh this specimen.');
          }
          await persistRejection(specimen, accepted.payload, accepted.receipt, false);
          acceptedRef.current = null;
          setHasAcceptedRejection(false);
          return { status: 'rejected', isQueued: false };
        }

        const results = specimen.serverId
          ? await database
              .get<AnalysisResult>('analysis_results')
              .query(Q.where('specimen_id', specimen.serverId))
              .fetch()
          : [];
        const resultStatus = specimen.serverId
          ? (latestAnalysisResultsBySpecimen(results).get(specimen.serverId)?.status ?? null)
          : null;
        const blockedReason = getRejectionEligibilityMessage(
          specimen,
          authStoreApi.getUserId(),
          resultStatus,
        );
        if (blockedReason) throw new Error(blockedReason);
        if (!Object.values(RejectionReason).includes(reason))
          throw new Error('Select a rejection reason.');
        if (note.length > MAX_REJECTION_NOTE_LENGTH) {
          throw new Error(`Notes must be ${MAX_REJECTION_NOTE_LENGTH} characters or fewer.`);
        }
        const payload: SpecimenRejectRequest = { reasonCode: reason };
        if (note.trim()) payload.freeTextNote = note.trim();
        const serverId = specimen.serverId!;
        if (signal.aborted) return { status: 'busy' };

        let receipt: RejectionReceipt = {
          specimenId: serverId,
          rejectedAt: new Date().toISOString(),
        };
        if (isOnline) {
          receipt = mapRejectionToReceipt(
            await specimenRejectionApi.reject(serverId, payload, signal),
          );
          acceptedRef.current = { localSpecimenId: specimenId, userId, payload, receipt };
          setHasAcceptedRejection(true);
        }
        await persistRejection(specimen, payload, receipt, !isOnline);
        acceptedRef.current = null;
        setHasAcceptedRejection(false);
        return { status: 'rejected', isQueued: !isOnline };
      } catch (error: unknown) {
        if (signal.aborted) return { status: 'busy' };
        console.error('[SpecimenRejection] Failed to reject specimen', error);
        const message = acceptedRef.current
          ? 'The server accepted this rejection, but this device could not save it. Retry to update this device.'
          : getErrorMessage(error, 'Failed to reject specimen. Please try again.');
        return { status: 'failed', message };
      }
    },
    [specimenId, isOnline],
  );
  const { run, isLoading } = useAsyncAction('SpecimenRejection', action);
  const reject = useCallback(
    async (reason: RejectionReason, note?: string): Promise<RejectResult> => {
      if (isSubmittingRef.current) return { status: 'busy' };
      isSubmittingRef.current = true;
      try {
        return (await run(reason, note)) ?? { status: 'busy' };
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [run],
  );

  return { reject, isLoading, hasAcceptedRejection };
}
