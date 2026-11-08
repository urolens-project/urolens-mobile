import type Specimen from '@db/models/Specimen';
import type AnalysisResult from '@db/models/AnalysisResult';
import type { SpecimenStatus } from '@app-types/enums';

import { getRejectBlockedReason } from '@features/queue/lib/sampleState';

import { SPECIMEN_REJECTION_TEXT } from '../constants/specimenRejectionText.constant';

/**
 * @description Checks assignment and workflow before exposing or submitting a rejection.
 * @param specimen - Local specimen to reject, if it still exists.
 * @param userId - Authenticated MedTech identifier.
 * @param resultStatus - Latest result status, if a result exists.
 */
export function getRejectionEligibilityMessage(
  specimen: Specimen | null,
  userId: string | null,
  resultStatus: AnalysisResult['status'] | null,
): string | null {
  if (!specimen) return SPECIMEN_REJECTION_TEXT.specimenNotFoundMessage;
  if (!userId || specimen.medtechId !== userId) {
    return SPECIMEN_REJECTION_TEXT.notAssignedMessage;
  }
  if (!specimen.serverId) return SPECIMEN_REJECTION_TEXT.notSyncedMessage;
  return getRejectBlockedReason(specimen.status as SpecimenStatus, resultStatus);
}
