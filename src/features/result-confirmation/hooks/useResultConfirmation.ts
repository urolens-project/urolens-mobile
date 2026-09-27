import { useState, useEffect, useMemo } from 'react';

import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import AnalysisResult from '@db/models/AnalysisResult';

import { useConfirmAction } from './useConfirmAction';
import type { AIFindingEntry } from '../types';

export interface UseResultConfirmationReturn {
  result: AnalysisResult | null;
  aiFindings: AIFindingEntry[];
  isLoading: boolean;
  isConfirming: boolean;
  error: string | null;
  confirmResult: () => Promise<void>;
}

/**
 * @description Derives a structured `AIFindingEntry` list from the raw findings map.
 * A particle is anomalous when its count exceeds the 5-per-field threshold.
 * @param raw - Raw particle-name → count map from the analysis result.
 */
function deriveFindings(raw: Record<string, number>): AIFindingEntry[] {
  return Object.entries(raw).map(([parameter, count]) => ({
    parameter,
    count,
    isAnomalous: count > 5,
  }));
}

/**
 * @description Loads one analysis result from the local WatermelonDB by server id and
 * exposes its AI findings plus confirm-action state. Components never call the API
 * directly — they observe the local record and confirm through `useConfirmAction`.
 * @param resultId - Server id of the analysis result to load.
 */
export function useResultConfirmation(resultId: string): UseResultConfirmationReturn {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { confirmResult: confirmAction, isConfirming, error } = useConfirmAction();

  // Observe local WatermelonDB record — components never call API directly (SRP)
  useEffect(() => {
    const subscription = database
      .get<AnalysisResult>('analysis_results')
      .query(Q.where('server_id', resultId))
      .observe()
      .subscribe((records) => {
        setResult(records[0] ?? null);
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [resultId]);

  const confirmResult = async (): Promise<void> => {
    if (!result) return;
    await confirmAction(result);
  };

  const aiFindings = useMemo<AIFindingEntry[]>(
    () => (result ? deriveFindings(result.aiFindings) : []),
    [result],
  );

  return { result, aiFindings, isLoading, isConfirming, error, confirmResult };
}
