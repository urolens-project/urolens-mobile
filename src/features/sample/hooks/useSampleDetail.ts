import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';

import { database } from '@db/database';
import { latestAnalysisResultsBySpecimen } from '@db/latestAnalysisResultsBySpecimen';
import Specimen from '@db/models/Specimen';
import AnalysisResult from '@db/models/AnalysisResult';
import ManualOverride from '@db/models/ManualOverride';

import type { QueueItem } from '@features/queue/types';

import { RESULT_COLUMNS } from '../constants';
import { toQueueItem } from '../lib/toQueueItem';

export interface UseSampleDetailResult {
  specimen: QueueItem | null;
  analysisResult: AnalysisResult | null;
  overrides: Record<string, number>;
  isLoading: boolean;
  notFound: boolean;
}

/**
 * @description Loads a specimen, its latest analysis result, and any manual overrides,
 * and keeps them live via WatermelonDB observers so a sync (a Supervisor's approval,
 * return, or escalation) updates the sample detail screen without a manual refresh.
 * @param specimenId - Local WatermelonDB specimen id from the route.
 */
export function useSampleDetail(specimenId: string): UseSampleDetailResult {
  const [specimen, setSpecimen] = useState<QueueItem | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // The three effects below must stay unconditional (Rules of Hooks). Internal
  // guards make them no-ops when specimenId/serverId are absent.
  useEffect(() => {
    if (!specimenId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    // `cancelled` covers the gap before find() resolves: if the screen unmounts in that
    // window there is nothing to unsubscribe yet, and a late subscribe would leak.
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    database
      .get<Specimen>('specimens')
      .find(specimenId)
      .then(
        (model) => {
          if (cancelled) return;
          subscription = model.observe().subscribe((s) => {
            setSpecimen(toQueueItem(s));
            setIsLoading(false);
          });
        },
        () => {
          if (cancelled) return;
          setNotFound(true);
          setIsLoading(false);
        },
      );

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [specimenId]);

  useEffect(() => {
    if (!specimen?.serverId) return;
    const specimenServerId = specimen.serverId;

    const subscription = database
      .get<AnalysisResult>('analysis_results')
      .query(Q.where('specimen_id', specimenServerId))
      .observeWithColumns(RESULT_COLUMNS)
      .subscribe((results) => {
        // The backend keeps one result per specimen; picking "the latest" is the same
        // safety net the Queue uses if a sync ever leaves a stale duplicate behind.
        setAnalysisResult(latestAnalysisResultsBySpecimen(results).get(specimenServerId) ?? null);
      });

    return () => subscription.unsubscribe();
  }, [specimen?.serverId]);

  useEffect(() => {
    if (!analysisResult?.serverId) return;

    const subscription = database
      .get<ManualOverride>('manual_overrides')
      .query(Q.where('result_id', analysisResult.serverId))
      .observeWithColumns(['parameter', 'corrected_value'])
      .subscribe((records) => {
        const map: Record<string, number> = {};
        for (const r of records) map[r.parameter] = r.correctedValue;
        setOverrides(map);
      });

    return () => subscription.unsubscribe();
  }, [analysisResult?.serverId]);

  return { specimen, analysisResult, overrides, isLoading, notFound };
}
