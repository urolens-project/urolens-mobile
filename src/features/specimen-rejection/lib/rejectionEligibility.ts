import type Specimen from '@db/models/Specimen';
import type AnalysisResult from '@db/models/AnalysisResult';
import type { SpecimenStatus } from '@app-types/enums';

import { getRejectBlockedReason } from '@features/queue/lib/sampleState';

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
  if (!specimen) return 'This specimen could not be found. Return to the queue and try again.';
  if (!userId || specimen.medtechId !== userId) {
    return 'You can only reject a specimen assigned to you.';
  }
  if (!specimen.serverId) return 'Specimen has not been synced to the server yet.';
  return getRejectBlockedReason(specimen.status as SpecimenStatus, resultStatus);
}
