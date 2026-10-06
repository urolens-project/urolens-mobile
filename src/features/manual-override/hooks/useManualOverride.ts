import { useCallback, useRef } from 'react';

import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import type AnalysisResult from '@db/models/AnalysisResult';
import type ManualOverride from '@db/models/ManualOverride';
import { useAsyncAction } from '@hooks/useAsyncAction';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useUserId } from '@lib/auth/authStore';
import { getErrorMessage } from '@lib/errorMessage';

import { manualOverrideApi } from '../api/manualOverrideApi';
import { getOverrideValidationError } from '../lib/overrideValidation';
import { persistOverride } from '../lib/persistOverride';
import { mapManualOverride, mapOverrideContext } from '../mappers/manualOverride.mapper';
import type { ManualOverrideRecord, OverridePayload } from '../types';

export interface UseManualOverrideResult {
  isSubmitting: boolean;
  error: string | null;
  submitOverride: (resultId: string, payload: OverridePayload) => Promise<boolean>;
}

interface AcceptedOverride {
  fingerprint: string;
  record: ManualOverrideRecord;
}

/**
 * @description Saves a validated correction, queues offline writes atomically and reports success only after the result can display it.
 */
export function useManualOverride(): UseManualOverrideResult {
  const { isOnline } = useNetworkStatus();
  const userId = useUserId();
  const submittingRef = useRef(false);
  const acceptedRef = useRef<AcceptedOverride | null>(null);

  const performSubmit = useCallback(
    async (signal: AbortSignal, resultId: string, payload: OverridePayload): Promise<boolean> => {
      try {
        if (!userId) throw new Error('Sign in again before submitting a correction.');
        const fingerprint = JSON.stringify([userId, resultId, payload]);
        // A retry after local storage failure must not create another server override.
        if (acceptedRef.current?.fingerprint === fingerprint) {
          await persistOverride(acceptedRef.current.record);
          acceptedRef.current = null;
          return !signal.aborted;
        }
        const results = await database
          .get<AnalysisResult>('analysis_results')
          .query(Q.where('server_id', resultId))
          .fetch();
        const overrides = await database
          .get<ManualOverride>('manual_overrides')
          .query(
            Q.where('result_id', resultId),
            Q.where('parameter', payload.parameter),
            Q.sortBy('created_at', Q.desc),
            Q.take(1),
          )
          .fetch();
        const context = mapOverrideContext(
          results[0] ?? null,
          overrides[0] ?? null,
          payload.parameter,
        );
        if (context.originalAiValue === null)
          throw new Error(
            'The original AI finding is unavailable. Return to the result and retry.',
          );
        if (!context.canEdit)
          throw new Error(
            'This result is no longer editable. Return to the result to see its current status.',
          );
        const validationError = getOverrideValidationError(
          payload.correctedValue,
          payload.rationale,
          context.currentValue,
        );
        if (validationError) throw new Error(validationError);
        const normalized: OverridePayload = {
          ...payload,
          originalAiValue: context.originalAiValue,
          rationale: payload.rationale.trim(),
        };
        if (signal.aborted) return false;
        if (isOnline) {
          const dto = await manualOverrideApi.submit(resultId, normalized, signal);
          const record = mapManualOverride(dto);
          acceptedRef.current = { fingerprint, record };
          await persistOverride(record);
          acceptedRef.current = null;
        } else {
          const createdAt = Date.now();
          await persistOverride(
            {
              ...normalized,
              id: '',
              serverId: null,
              resultId,
              overriddenBy: userId,
              isSynced: false,
              createdAt,
            },
            normalized,
          );
        }
        return !signal.aborted;
      } catch (cause: unknown) {
        throw new Error(getErrorMessage(cause, 'Failed to submit override. Please retry.'));
      }
    },
    [isOnline, userId],
  );
  const { run, isLoading: isSubmitting, error } = useAsyncAction('ManualOverride', performSubmit);

  const submitOverride = useCallback(
    async (resultId: string, payload: OverridePayload): Promise<boolean> => {
      if (submittingRef.current) return false;
      submittingRef.current = true;
      try {
        return (await run(resultId, payload)) === true;
      } finally {
        submittingRef.current = false;
      }
    },
    [run],
  );

  return { isSubmitting, error: error?.message ?? null, submitOverride };
}
