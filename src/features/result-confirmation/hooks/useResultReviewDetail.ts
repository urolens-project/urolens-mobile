import { useCallback, useEffect, useState } from 'react';

import { useAsyncAction } from '@hooks/useAsyncAction';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useUserId } from '@lib/auth/authStore';
import { getErrorMessage } from '@lib/errorMessage';

import { resultReviewApi } from '../api/resultReviewApi';
import { mapResultReviewDetail } from '../mappers/resultReview.mapper';
import type { ResultReviewDetail } from '../types';

interface UseResultReviewDetailResult {
  detail: ResultReviewDetail | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

interface LoadedReviewDetail {
  detail: ResultReviewDetail;
  localRevision: string | undefined;
  userId: string | null;
}

/**
 * @description Loads details absent from the sync cache and retries when connectivity returns.
 * @param resultId - Server result identifier.
 * @param localRevision - Changed result/image data invalidates the previous server snapshot.
 */
export function useResultReviewDetail(
  resultId: string,
  localRevision?: string,
): UseResultReviewDetailResult {
  const userId = useUserId();
  const { isOnline } = useNetworkStatus();
  const [loaded, setLoaded] = useState<LoadedReviewDetail | null>(null);
  const load = useCallback(
    async (signal: AbortSignal): Promise<void> => {
      if (!isOnline || !resultId) return;
      try {
        const dto = await resultReviewApi.getDetail(resultId, signal);
        if (!signal.aborted)
          setLoaded({ detail: mapResultReviewDetail(dto), localRevision, userId });
      } catch (error: unknown) {
        throw new Error(getErrorMessage(error, 'Could not load the result details. Please retry.'));
      }
    },
    [isOnline, localRevision, resultId, userId],
  );
  const { run, isLoading, error } = useAsyncAction('ResultReviewDetail', load);

  useEffect((): void => {
    setLoaded(null);
  }, [resultId, userId]);
  useEffect((): void => {
    void run();
  }, [run]);

  const refresh = useCallback(async (): Promise<void> => {
    await run();
  }, [run]);
  const detail =
    loaded?.localRevision === localRevision && loaded?.userId === userId
      ? (loaded?.detail ?? null)
      : null;
  return { detail, isLoading, error, refresh };
}
