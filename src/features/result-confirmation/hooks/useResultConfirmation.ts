import { useCallback, useState, useEffect, useMemo } from 'react';

import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import type AnalysisResult from '@db/models/AnalysisResult';

import { RESULT_COLUMNS } from '@features/sample/constants';

import { useConfirmAction } from './useConfirmAction';
import type { ConfirmActionResult } from './useConfirmAction';
import type { AIFindingEntry } from '../types';

export interface UseResultConfirmationReturn {
  result: AnalysisResult | null;
  aiFindings: AIFindingEntry[];
  isLoading: boolean;
  isConfirming: boolean;
  error: string | null;
  confirmResult: () => Promise<ConfirmActionResult>;
}

interface ResultSnapshot {
  result: AnalysisResult | null;
}

/**
 * @description Derives a structured `AIFindingEntry` list from the raw findings map.
 * A particle is anomalous when its count exceeds the 5-per-field threshold.
 * @param raw - Raw particle-name → count map from the analysis result.
 */
function deriveFindings(raw: Record<string, number>): AIFindingEntry[] {
  return Object.entries(raw).map(
    ([parameter, count]): AIFindingEntry => ({
      parameter,
      count,
      isAnomalous: count > 5,
    }),
  );
}

/**
 * @description Loads one analysis result from the local WatermelonDB by server id and
 * exposes its AI findings plus confirm-action state. Components never call the API
 * directly — they observe the local record and confirm through `useConfirmAction`.
 * @param resultId - Server id of the analysis result to load.
 */
export function useResultConfirmation(resultId: string): UseResultConfirmationReturn {
  // WatermelonDB mutates model instances in place; a new snapshot makes every column emission render.
  const [snapshot, setSnapshot] = useState<ResultSnapshot>({ result: null });
  const result = snapshot.result;
  const [isLoading, setIsLoading] = useState(true);
  const { confirmResult: confirmAction, isConfirming, error } = useConfirmAction();

  // Observe local WatermelonDB record — components never call API directly (SRP)
  useEffect((): (() => void) => {
    const subscription = database
      .get<AnalysisResult>('analysis_results')
      .query(Q.where('server_id', resultId))
      .observeWithColumns(RESULT_COLUMNS)
      .subscribe((records: AnalysisResult[]): void => {
        setSnapshot({ result: records[0] ?? null });
        setIsLoading(false);
      });

    return (): void => subscription.unsubscribe();
  }, [resultId]);

  const confirmResult = useCallback(async (): Promise<ConfirmActionResult> => {
    if (!result) return { status: 'failed', message: 'Result not found. Please retry.' };
    return confirmAction(result);
  }, [result, confirmAction]);

  const aiFindings = useMemo<AIFindingEntry[]>(
    (): AIFindingEntry[] => (snapshot.result ? deriveFindings(snapshot.result.aiFindings) : []),
    [snapshot],
  );

  return { result, aiFindings, isLoading, isConfirming, error, confirmResult };
}
