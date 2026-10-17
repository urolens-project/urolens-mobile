import { useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import type AnalysisResult from '@db/models/AnalysisResult';

import { confirmRetake } from '@features/image-retake/lib/confirmRetake';
import { useHasManualOverrides } from '@features/manual-override/hooks/useHasManualOverrides';

import { RESULT_CONFIRMATION_TEXT } from '../constants/resultConfirmationText.constant';
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
    const alertsText = RESULT_CONFIRMATION_TEXT.confirmAlerts;
    if (outcome.status === 'failed') {
      Alert.alert(alertsText.confirmationFailedTitle, outcome.message);
      return;
    }
    if (outcome.status !== 'confirmed') return;
    let message = isReturned ? alertsText.resubmittedMessage : alertsText.confirmedMessage;
    if (!isOnline)
      message = isReturned
        ? alertsText.resubmittedQueuedMessage
        : alertsText.confirmedQueuedMessage;
    Alert.alert(isReturned ? alertsText.resubmittedTitle : alertsText.confirmedTitle, message);
    router.replace('/(medtech)/queue');
  }, [canEdit, confirmResult, isBusy, isOnline, isReturned]);

  return { handleBack, handleOverride, handleReject, handleRetake, handleConfirm };
}
