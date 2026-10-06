import { useEffect, useState } from 'react';

import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import type AnalysisResult from '@db/models/AnalysisResult';
import type ManualOverride from '@db/models/ManualOverride';
import type { Unsubscribable } from '@db/observeQuery';
import { getErrorMessage } from '@lib/errorMessage';

import { OVERRIDE_COLUMNS, OVERRIDE_RESULT_COLUMNS } from '../constants/override.constant';
import { mapOverrideContext } from '../mappers/manualOverride.mapper';
import type { OverrideContext } from '../types';

interface UseOverrideContextResult {
  context: OverrideContext;
  isLoading: boolean;
  error: string | null;
}
interface ContextSnapshot {
  result: AnalysisResult | null;
  latestOverride: ManualOverride | null;
  hasResult: boolean;
  hasOverrides: boolean;
}
const EMPTY_SNAPSHOT: ContextSnapshot = {
  result: null,
  latestOverride: null,
  hasResult: false,
  hasOverrides: false,
};

/**
 * @description Observes stored AI findings instead of trusting a navigation value, including live status and correction updates.
 * @param resultId - Server result identifier.
 * @param parameter - Original AI parameter selected for correction.
 */
export function useOverrideContext(resultId: string, parameter: string): UseOverrideContextResult {
  const [snapshot, setSnapshot] = useState<ContextSnapshot>(EMPTY_SNAPSHOT);
  const [error, setError] = useState<string | null>(null);

  useEffect((): (() => void) => {
    setSnapshot(EMPTY_SNAPSHOT);
    setError(null);
    const subscriptions: Unsubscribable[] = [];
    const handleError = (cause: unknown): void => {
      console.error('[OverrideContext]', cause);
      setError(
        getErrorMessage(
          cause,
          'Could not load the original AI finding. Return to the result and retry.',
        ),
      );
    };
    try {
      subscriptions.push(
        database
          .get<AnalysisResult>('analysis_results')
          .query(Q.where('server_id', resultId))
          .observeWithColumns(OVERRIDE_RESULT_COLUMNS)
          .subscribe((records: AnalysisResult[]): void => {
            setSnapshot(
              (previous): ContextSnapshot => ({
                ...previous,
                result: records[0] ?? null,
                hasResult: true,
              }),
            );
          }, handleError),
      );
      subscriptions.push(
        database
          .get<ManualOverride>('manual_overrides')
          .query(
            Q.where('result_id', resultId),
            Q.where('parameter', parameter),
            Q.sortBy('created_at', Q.desc),
            Q.take(1),
          )
          .observeWithColumns(OVERRIDE_COLUMNS)
          .subscribe((records: ManualOverride[]): void => {
            setSnapshot(
              (previous): ContextSnapshot => ({
                ...previous,
                latestOverride: records[0] ?? null,
                hasOverrides: true,
              }),
            );
          }, handleError),
      );
    } catch (cause: unknown) {
      handleError(cause);
    }
    return (): void => subscriptions.forEach((subscription): void => subscription.unsubscribe());
  }, [parameter, resultId]);

  const context = mapOverrideContext(snapshot.result, snapshot.latestOverride, parameter);
  return { context, error, isLoading: !error && (!snapshot.hasResult || !snapshot.hasOverrides) };
}
