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
  isDirty: boolean;
  saveBeforeConfirm: (signal: AbortSignal) => Promise<void>;
  saveAnnotations: () => Promise<boolean>;
  confirmResult: (
    beforeConfirm?: (signal: AbortSignal) => Promise<void>,
  ) => Promise<ConfirmActionResult>;
}

interface UseResultReviewActionsResult {
  handleBack: () => void;
  handleOverride: (parameter: string, originalValue: number) => Promise<void>;
  handleReject: () => void;
  handleRetake: () => void;
  handleConfirm: () => Promise<void>;
}

/**
 * @description Guards leaving with unsaved edits and navigates to the queue only after successful submission.
 * @param input - Current result stage, draft state and shared confirmation action.
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
  isDirty,
  saveBeforeConfirm,
  saveAnnotations,
  confirmResult,
}: ResultReviewActionsInput): UseResultReviewActionsResult {
  const hasOverrides = useHasManualOverrides(resultId);
  const leaveWithDraft = useCallback(
    (leave: () => void): void => {
      if (isBusy) return;
      if (!isDirty) {
        leave();
        return;
      }
      Alert.alert('Unsaved annotations', 'Leave without saving your annotation changes?', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard changes', style: 'destructive', onPress: leave },
      ]);
    },
    [isBusy, isDirty],
  );
  const handleBack = useCallback((): void => {
    leaveWithDraft((): void => router.replace('/(medtech)/queue'));
  }, [leaveWithDraft]);
  const handleOverride = useCallback(
    async (parameter: string, originalValue: number): Promise<void> => {
      if (!canEdit || isBusy) return;
      // The existing override route replaces the review route when it returns, so save the draft first.
      if (isDirty && !(await saveAnnotations())) return;
      router.push({
        pathname: '/(medtech)/sample/override/[id]',
        params: { id: resultId, specimenId, parameter, originalValue: String(originalValue) },
      });
    },
    [canEdit, isBusy, isDirty, resultId, saveAnnotations, specimenId],
  );
  const handleReject = useCallback((): void => {
    if (canReject && !isBusy)
      leaveWithDraft((): void => router.push(`/(medtech)/sample/reject/${specimenId}`));
  }, [canReject, isBusy, leaveWithDraft, specimenId]);
  const handleRetake = useCallback((): void => {
    if (!canEdit || isBusy || !result?.specimenId) return;
    leaveWithDraft((): void =>
      confirmRetake(hasOverrides, (): void => {
        router.push({
          pathname: '/(medtech)/capture',
          params: {
            specimenId: result.specimenId,
            localSpecimenId: specimenId,
            existingImageId: result.imageId ?? undefined,
          },
        });
      }),
    );
  }, [canEdit, hasOverrides, isBusy, leaveWithDraft, result, specimenId]);
  const handleConfirm = useCallback(async (): Promise<void> => {
    if (!canEdit || isBusy) return;
    const outcome = await confirmResult(saveBeforeConfirm);
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
  }, [saveBeforeConfirm, canEdit, confirmResult, isBusy, isOnline, isReturned]);

  return { handleBack, handleOverride, handleReject, handleRetake, handleConfirm };
}
