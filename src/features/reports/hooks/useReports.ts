import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { database } from '@db/database';
import { observeQuery } from '@db/observeQuery';
import type Specimen from '@db/models/Specimen';
import type AnalysisResult from '@db/models/AnalysisResult';
import { synchronize } from '@db/sync/syncManager';
import { useAsyncAction } from '@hooks/useAsyncAction';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

import {
  REPORT_FOCUS_POLL_INTERVAL_MS,
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

  // Local writes (accept/discard, submit) show up instantly via observeQuery above, but
  // anything decided server-side (a supervisor's approval/release) only arrives on the
  // next sync pull — which otherwise only happens on app mount/foreground/reconnect, or
  // on an incoming push notification (notificationHandler.ts). Sync on focus, then keep
  // polling every REPORT_FOCUS_POLL_INTERVAL_MS while this tab stays open, so a change
  // made while the medtech is sitting here still shows up without a manual reload.
  useFocusEffect(
    useCallback((): (() => void) => {
      void refresh();
      const intervalId = setInterval((): void => {
        void refresh();
      }, REPORT_FOCUS_POLL_INTERVAL_MS);
      return (): void => clearInterval(intervalId);
    }, [refresh]),
  );

  return {
    sections,
    isLoading: (!specimens && !specimenError) || (!results && !resultError),
    error: specimenError ?? resultError ?? syncError,
    totalCount: sections.reduce((count, section): number => count + section.data.length, 0),
    refresh,
    isRefreshing,
  };
}
