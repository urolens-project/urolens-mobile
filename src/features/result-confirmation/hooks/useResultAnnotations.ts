import { useCallback, useEffect, useRef, useState } from 'react';

import { useAsyncAction } from '@hooks/useAsyncAction';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { getErrorMessage } from '@lib/errorMessage';
import { useUserId } from '@lib/auth/authStore';

import { resultReviewApi } from '../api/resultReviewApi';
import type { AnnotationDraft, ResultReviewDetail, SpatialAnnotation } from '../types';

interface UseResultAnnotationsResult {
  draft: AnnotationDraft;
  isDirty: boolean;
  isSaving: boolean;
  error: Error | null;
  setNotes: (notes: string) => void;
  setBoxes: (boxes: SpatialAnnotation[]) => void;
  save: () => Promise<boolean>;
  saveBeforeConfirm: (signal: AbortSignal) => Promise<void>;
}

const EMPTY_DRAFT: AnnotationDraft = { annotationNotes: '', spatialAnnotations: [] };

/**
 * @description Owns an attributed draft and saves a snapshot before confirmation, retaining edits on failure.
 * @param detail - Current result and the signed-in reviewer's saved annotation.
 */
export function useResultAnnotations(
  detail: ResultReviewDetail | null,
): UseResultAnnotationsResult {
  const { isOnline } = useNetworkStatus();
  const userId = useUserId();
  const [draft, setDraft] = useState<AnnotationDraft>(EMPTY_DRAFT);
  const [savedDraft, setSavedDraft] = useState<AnnotationDraft>(EMPTY_DRAFT);
  const hydratedId = useRef<string | null>(null);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);

  useEffect((): void => {
    hydratedId.current = null;
    setDraft(EMPTY_DRAFT);
    setSavedDraft(EMPTY_DRAFT);
  }, [userId]);

  useEffect((): void => {
    if (!detail || hydratedId.current === detail.resultId) return;
    hydratedId.current = detail.resultId;
    setDraft(detail.annotation);
    setSavedDraft(detail.annotation);
  }, [detail]);

  const saveBeforeConfirm = useCallback(
    async (signal: AbortSignal): Promise<void> => {
      if (!isDirty) return;
      if (!detail || !isOnline) {
        throw new Error(
          'Connect to the internet to save your annotation changes before confirming.',
        );
      }
      try {
        await resultReviewApi.saveAnnotations(detail.resultId, draft, signal);
        if (signal.aborted) throw new Error('Annotation save was interrupted. Please retry.');
        setSavedDraft(draft);
      } catch (error: unknown) {
        throw new Error(
          `Annotations were not saved. ${getErrorMessage(error, 'Please retry.')} The result has not been confirmed.`,
        );
      }
    },
    [detail, draft, isDirty, isOnline],
  );
  const saveAction = useCallback(
    async (signal: AbortSignal): Promise<boolean> => {
      await saveBeforeConfirm(signal);
      return true;
    },
    [saveBeforeConfirm],
  );
  const { run, isLoading: isSaving, error } = useAsyncAction('ResultAnnotations', saveAction);

  const setNotes = useCallback((annotationNotes: string): void => {
    setDraft((previous): AnnotationDraft => ({ ...previous, annotationNotes }));
  }, []);
  const setBoxes = useCallback((spatialAnnotations: SpatialAnnotation[]): void => {
    setDraft((previous): AnnotationDraft => ({ ...previous, spatialAnnotations }));
  }, []);
  const save = useCallback(async (): Promise<boolean> => {
    return (await run()) === true;
  }, [run]);

  return { draft, isDirty, isSaving, error, setNotes, setBoxes, save, saveBeforeConfirm };
}
