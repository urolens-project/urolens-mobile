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

interface FindingsSource {
  aiFindings: Record<string, number>;
  particleClasses?: Record<string, number>;
  fieldSummary?: AnalysisResult['fieldSummary'];
}

/**
 * @description Derives a structured `AIFindingEntry` list for display (mobile-n8-todo-rem.md
 * B4). Prefers the confirmed `field_summary` per-class averages (backend #105) — each mean
 * shown as "<displayValue> per field" rather than a bare decimal — then the confirmed
 * `particle_classes`, falling back to the raw AI findings only when neither is present
 * (older local data, or a result predating the multi-field workflow). A particle is
 * anomalous when its raw count/mean exceeds the 5-per-field threshold, or when
 * `field_summary` itself flags the class as above normal in any field.
 * @param result - The analysis result's findings sources.
 */
function deriveFindings(result: FindingsSource): AIFindingEntry[] {
  const summary = result.fieldSummary;
  if (summary && Object.keys(summary.perClass).length > 0) {
    return Object.entries(summary.perClass).map(
      ([parameter, agg]): AIFindingEntry => ({
        parameter,
        count: Math.round(agg.mean),
        isAnomalous: (agg.fieldsAboveNormal?.length ?? 0) > 0,
        displayLabel: `${agg.displayValue} per field`,
      }),
    );
  }

  const source =
    result.particleClasses && Object.keys(result.particleClasses).length > 0
      ? result.particleClasses
      : result.aiFindings;
  return Object.entries(source).map(
    ([parameter, count]): AIFindingEntry => ({
      parameter,
      count: Math.round(count),
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
    (): AIFindingEntry[] => (snapshot.result ? deriveFindings(snapshot.result) : []),
    [snapshot],
  );

  return { result: snapshot.result, aiFindings, isLoading };
}
