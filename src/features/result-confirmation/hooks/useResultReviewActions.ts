import { useCallback } from 'react';
import { router } from 'expo-router';

interface ResultReviewActionsInput {
  specimenId: string;
  canReject: boolean;
}

interface UseResultReviewActionsResult {
  handleBack: () => void;
  handleReject: () => void;
}

/**
 * @description Guards the one review action mobile still offers once a result is
 * read-only: Reject. Confirm, Retake and Override moved to the website (mobile PR
 * #55 review, #3) — every status this screen renders is already past the MedTech's
 * own sign-off.
 * @param input - Current specimen id and the shared reject guard.
 */
export function useResultReviewActions({
  specimenId,
  canReject,
}: ResultReviewActionsInput): UseResultReviewActionsResult {
  const handleBack = useCallback((): void => {
    router.replace('/(medtech)/queue');
  }, []);
  const handleReject = useCallback((): void => {
    if (canReject) router.push(`/(medtech)/sample/reject/${specimenId}`);
  }, [canReject, specimenId]);

  return { handleBack, handleReject };
}
