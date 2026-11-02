import { useEffect, useMemo, useState } from 'react';

import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import type AnalysisResult from '@db/models/AnalysisResult';

import { RESULT_COLUMNS } from '@features/sample/constants';

import type { AIFindingEntry } from '../types';

export interface UseResultConfirmationReturn {
  result: AnalysisResult | null;
  aiFindings: AIFindingEntry[];
  isLoading: boolean;
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
 * exposes its AI findings for read-only review. Confirming, retaking and overriding
 * all moved to the website (mobile PR #55 review, #3), so this only observes.
 * @param resultId - Server id of the analysis result to load.
 */
export function useResultConfirmation(resultId: string): UseResultConfirmationReturn {
  // WatermelonDB mutates model instances in place; a new snapshot makes every column emission render.
  const [snapshot, setSnapshot] = useState<ResultSnapshot>({ result: null });
  const [isLoading, setIsLoading] = useState(true);

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

  const aiFindings = useMemo<AIFindingEntry[]>(
    (): AIFindingEntry[] => (snapshot.result ? deriveFindings(snapshot.result.aiFindings) : []),
    [snapshot],
  );

  return { result: snapshot.result, aiFindings, isLoading };
}
