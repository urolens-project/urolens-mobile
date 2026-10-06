import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';

import { database } from '@db/database';
import type AnalysisResult from '@db/models/AnalysisResult';
import type Specimen from '@db/models/Specimen';
import { latestAnalysisResultsBySpecimen } from '@db/latestAnalysisResultsBySpecimen';
import { useUserId } from '@lib/auth/authStore';
import { getErrorMessage } from '@lib/errorMessage';

import {
  RESULT_REJECTION_COLUMNS,
  SPECIMEN_REJECTION_COLUMNS,
} from '../constants/specimenRejection.constant';
import { getRejectionEligibilityMessage } from '../lib/rejectionEligibility';
import { mapSpecimenToRejectionInfo } from '../mappers/specimenRejection.mapper';
import type { SpecimenInfo } from '../types';

export interface UseSpecimenRejectionInfoResult {
  specimenInfo: SpecimenInfo | null;
  isLoadingSpecimen: boolean;
  blockedReason: string | null;
}

interface RejectionInfoState extends UseSpecimenRejectionInfoResult {
  specimenId: string;
  userId: string | null;
}

/**
 * @description Observes assignment and the latest result, keeping rejection blocked until both load.
 * @param specimenId - Local specimen identifier from the route.
 */
export function useSpecimenRejectionInfo(specimenId: string): UseSpecimenRejectionInfoResult {
  const userId = useUserId();
  const [state, setState] = useState<RejectionInfoState>({
    specimenId,
    userId,
    specimenInfo: null,
    isLoadingSpecimen: true,
    blockedReason: null,
  });

  useEffect(() => {
    let isActive = true;
    let unsubscribeResult: (() => void) | undefined;
    const publish = (value: UseSpecimenRejectionInfoResult): void => {
      if (isActive) setState({ ...value, specimenId, userId });
    };
    const handleError = (error: unknown): void => {
      console.error('[SpecimenRejection] Failed to load specimen', error);
      publish({
        specimenInfo: null,
        isLoadingSpecimen: false,
        blockedReason: getErrorMessage(
          error,
          'Unable to load this specimen. Return to the queue and try again.',
        ),
      });
    };
    if (!specimenId) {
      publish({
        specimenInfo: null,
        isLoadingSpecimen: false,
        blockedReason: getRejectionEligibilityMessage(null, userId, null),
      });
      return;
    }

    const subscription = database
      .get<Specimen>('specimens')
      .query(Q.where('id', specimenId))
      .observeWithColumns(SPECIMEN_REJECTION_COLUMNS)
      .subscribe({
        next: (specimens): void => {
          unsubscribeResult?.();
          const specimen = specimens[0] ?? null;
          const specimenInfo = specimen ? mapSpecimenToRejectionInfo(specimen) : null;
          const blockedReason = getRejectionEligibilityMessage(specimen, userId, null);
          if (blockedReason || !specimen?.serverId) {
            publish({ specimenInfo, isLoadingSpecimen: false, blockedReason });
            return;
          }
          const serverId = specimen.serverId;
          publish({ specimenInfo, isLoadingSpecimen: true, blockedReason: null });
          const resultSubscription = database
            .get<AnalysisResult>('analysis_results')
            .query(Q.where('specimen_id', serverId))
            .observeWithColumns(RESULT_REJECTION_COLUMNS)
            .subscribe({
              next: (results): void => {
                const resultStatus =
                  latestAnalysisResultsBySpecimen(results).get(serverId)?.status ?? null;
                publish({
                  specimenInfo,
                  isLoadingSpecimen: false,
                  blockedReason: getRejectionEligibilityMessage(specimen, userId, resultStatus),
                });
              },
              error: handleError,
            });
          unsubscribeResult = (): void => resultSubscription.unsubscribe();
        },
        error: handleError,
      });
    return (): void => {
      isActive = false;
      subscription.unsubscribe();
      unsubscribeResult?.();
    };
  }, [specimenId, userId]);

  if (state.specimenId !== specimenId || state.userId !== userId) {
    return { specimenInfo: null, isLoadingSpecimen: true, blockedReason: null };
  }
  return {
    specimenInfo: state.specimenInfo,
    isLoadingSpecimen: state.isLoadingSpecimen,
    blockedReason: state.blockedReason,
  };
}
