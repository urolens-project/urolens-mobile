import { useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import type AnalysisResult from '@db/models/AnalysisResult';

import { confirmRetake } from '@features/image-retake/lib/confirmRetake';
import { useHasManualOverrides } from '@features/manual-override/hooks/useHasManualOverrides';

import type { ConfirmActionResult } from './useConfirmAction';

interface ResultReviewActionsInput {
  resultId: string;
  specimenId: string;
  result: AnalysisResult | null;
  isOnline: boolean;
  isBusy: boolean;
  canEdit: boolean;
  canReject: boolean;
  isReturned: boolean;
  confirmResult: () => Promise<ConfirmActionResult>;
}

interface UseResultReviewActionsResult {
  handleBack: () => void;
  handleOverride: (parameter: string, originalValue: number) => void;
  handleReject: () => void;
  handleRetake: () => void;
  handleConfirm: () => Promise<void>;
}

/**
 * @description Guards review actions and navigates to the queue after successful submission.
 * @param input - Current result stage and shared confirmation action.
 */
export function useResultReviewActions({
  resultId,
  specimenId,
  result,
  isOnline,
  isBusy,
  canEdit,
  canReject,
  isReturned,
  confirmResult,
}: ResultReviewActionsInput): UseResultReviewActionsResult {
  const hasOverrides = useHasManualOverrides(resultId);
  const handleBack = useCallback((): void => {
    if (!isBusy) router.replace('/(medtech)/queue');
  }, [isBusy]);
  const handleOverride = useCallback(
    (parameter: string, originalValue: number): void => {
      if (!canEdit || isBusy) return;
      router.push({
        pathname: '/(medtech)/sample/override/[id]',
        params: { id: resultId, specimenId, parameter, originalValue: String(originalValue) },
      });
    },
    [canEdit, isBusy, resultId, specimenId],
  );
  const handleReject = useCallback((): void => {
    if (canReject && !isBusy) router.push(`/(medtech)/sample/reject/${specimenId}`);
  }, [canReject, isBusy, specimenId]);
  const handleRetake = useCallback((): void => {
    if (!canEdit || isBusy || !result?.specimenId) return;
    confirmRetake(hasOverrides, (): void => {
      router.push({
        pathname: '/(medtech)/capture',
        params: {
          specimenId: result.specimenId,
          localSpecimenId: specimenId,
          existingImageId: result.imageId ?? undefined,
        },
      });
    });
  }, [canEdit, hasOverrides, isBusy, result, specimenId]);
  const handleConfirm = useCallback(async (): Promise<void> => {
    if (!canEdit || isBusy) return;
    const outcome = await confirmResult();
    if (outcome.status === 'failed') {
      Alert.alert('Confirmation Failed', outcome.message);
      return;
    }
    if (outcome.status !== 'confirmed') return;
    let message = isReturned
      ? 'The result has been re-submitted for supervisor approval.'
      : 'The result has been submitted for supervisor approval.';
    if (!isOnline)
      message = isReturned
        ? 'Your re-confirmation is queued and will be re-submitted for supervisor approval when the device syncs.'
        : 'Your confirmation is queued and will be sent for supervisor approval when the device syncs.';
    Alert.alert(isReturned ? 'Result Re-submitted' : 'Result Confirmed', message);
    router.replace('/(medtech)/queue');
  }, [canEdit, confirmResult, isBusy, isOnline, isReturned]);

  return { handleBack, handleOverride, handleReject, handleRetake, handleConfirm };
}
