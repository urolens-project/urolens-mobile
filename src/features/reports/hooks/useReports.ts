import { useCallback, useEffect, useState } from 'react';

import { database } from '@db/database';
import { observeQuery } from '@db/observeQuery';
import type Specimen from '@db/models/Specimen';
import type AnalysisResult from '@db/models/AnalysisResult';
import { synchronize } from '@db/sync/syncManager';
import { useAsyncAction } from '@hooks/useAsyncAction';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

import {
  REPORT_RESULT_COLUMNS,
  REPORT_SPECIMEN_COLUMNS,
} from '../constants/reportHistory.constant';
import { mapReportsToUi } from '../mappers/report.mapper';
import type { ReportSection } from '../types';

export interface UseReportsResult {
  sections: ReportSection[];
  isLoading: boolean;
  error: Error | null;
  totalCount: number;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

/**
 * @description Observes current and historical reports cached on the device,
 * including status changes to existing rows, and exposes a manual sync refresh.
 */
export function useReports(): UseReportsResult {
  const { isOnline } = useNetworkStatus();

  const [specimens, setSpecimens] = useState<Specimen[] | null>(null);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [specimenError, setSpecimenError] = useState<Error | null>(null);
  const [resultError, setResultError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const syncReports = useCallback(async (): Promise<void> => {
    await synchronize();
  }, []);
  const {
    run: runSync,
    isLoading: isRefreshing,
    error: syncError,
  } = useAsyncAction('Reports', syncReports);
  const sections = mapReportsToUi(specimens ?? [], results ?? []);

  useEffect((): (() => void) => {
    const subscription = observeQuery(
      database.get<Specimen>('specimens').query(),
      (rows): void => {
        setSpecimens([...rows]);
        setSpecimenError(null);
      },
      { columns: REPORT_SPECIMEN_COLUMNS, onError: setSpecimenError },
    );
    return (): void => subscription.unsubscribe();
  }, [reloadKey]);

  useEffect((): (() => void) => {
    const subscription = observeQuery(
      database.get<AnalysisResult>('analysis_results').query(),
      (rows): void => {
        setResults([...rows]);
        setResultError(null);
      },
      { columns: REPORT_RESULT_COLUMNS, onError: setResultError },
    );
    return (): void => subscription.unsubscribe();
  }, [reloadKey]);

  const refresh = useCallback(async (): Promise<void> => {
    if (specimenError || resultError) setReloadKey((key): number => key + 1);
    if (!isOnline) return;
    await runSync();
  }, [isOnline, runSync, specimenError, resultError]);

  return {
    sections,
    isLoading: (!specimens && !specimenError) || (!results && !resultError),
    error: specimenError ?? resultError ?? syncError,
    totalCount: sections.reduce((count, section): number => count + section.data.length, 0),
    refresh,
    isRefreshing,
  };
}
