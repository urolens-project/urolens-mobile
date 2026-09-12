import { useEffect, useState } from 'react';
import { database } from '@db/database';
import { observeQuery } from '@db/observeQuery';
import { latestAnalysisResultsBySpecimen } from '@db/latestAnalysisResultsBySpecimen';
import Specimen from '@db/models/Specimen';
import AnalysisResult from '@db/models/AnalysisResult';
import type { ResultStatus } from '@db/models/AnalysisResult';
import { synchronize } from '@db/sync/syncManager';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import {
  REPORT_CATEGORY_ORDER,
  REPORT_CATEGORY_TITLES,
  type ReportCategory,
  type ReportItem,
  type ReportSection,
} from '../types';

function resultStatusToCategory(status: ResultStatus): ReportCategory | null {
  switch (status) {
    case 'PENDING_SUPERVISOR_APPROVAL':
      return 'PENDING_APPROVAL';
    case 'APPROVED':
      return 'APPROVED';
    case 'RELEASED':
      return 'RELEASED';
    default:
      return null;
  }
}

function buildItems(specimens: Specimen[], results: AnalysisResult[]): ReportItem[] {
  const specimenByServerId = new Map(
    specimens.filter((s) => s.serverId).map((s) => [s.serverId as string, s]),
  );

  const items: ReportItem[] = [];

  for (const s of specimens) {
    if (s.status !== 'REJECTED') continue;
    items.push({
      id: s.id,
      sampleUid: s.sampleUid,
      patientUid: s.patientUid,
      testType: s.testType,
      priorityLevel: s.priorityLevel as ReportItem['priorityLevel'],
      receivedAt: s.receivedAt,
      category: 'REJECTED',
      finalizedAt: s.rejectedAt ?? s.receivedAt,
      rejectionReason: s.rejectionReason,
    });
  }

  // A specimen can have more than one analysis_results row (e.g. a retake
  // after being returned for correction creates a new row) — only its
  // LATEST result determines which category (if any) it belongs in, or a
  // superseded "Pending Approval" row could keep showing a specimen that
  // has since moved on to Approved or Released.
  const latestResults = latestAnalysisResultsBySpecimen(results);
  for (const r of latestResults.values()) {
    const category = resultStatusToCategory(r.status);
    if (!category) continue;
    const specimen = specimenByServerId.get(r.specimenId);
    if (!specimen) continue;
    items.push({
      id: specimen.id,
      sampleUid: specimen.sampleUid,
      patientUid: specimen.patientUid,
      testType: specimen.testType,
      priorityLevel: specimen.priorityLevel as ReportItem['priorityLevel'],
      receivedAt: specimen.receivedAt,
      category,
      finalizedAt: r.confirmedAt ?? specimen.receivedAt,
      rejectionReason: null,
    });
  }

  return items;
}

function buildSections(items: ReportItem[]): ReportSection[] {
  // Always all 4 categories, in fixed order — even when empty. The Reports
  // screen shows one card per category (with its count) before drilling into
  // any single category's list, so callers need the full set to render.
  return REPORT_CATEGORY_ORDER.map((category) => ({
    category,
    title: REPORT_CATEGORY_TITLES[category],
    data: items
      .filter((i) => i.category === category)
      .sort((a, b) => new Date(b.finalizedAt).getTime() - new Date(a.finalizedAt).getTime()),
  }));
}

export interface UseReportsResult {
  sections: ReportSection[];
  isLoading: boolean;
  totalCount: number;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function useReports(): UseReportsResult {
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isLoadingSpecimens, setIsLoadingSpecimens] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    const subscription = observeQuery(database.get<Specimen>('specimens').query(), (rows) => {
      setSpecimens(rows);
      setIsLoadingSpecimens(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetches every result, not pre-filtered by status: a specimen can have
  // more than one analysis_results row, and only its latest one should
  // count (see buildItems / latestAnalysisResultsBySpecimen).
  useEffect(() => {
    const subscription = observeQuery(
      database.get<AnalysisResult>('analysis_results').query(),
      (rows) => {
        setResults(rows);
        setIsLoadingResults(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    if (!isOnline) return;
    setIsRefreshing(true);
    try {
      await synchronize();
    } finally {
      setIsRefreshing(false);
    }
  };

  const items = buildItems(specimens, results);

  return {
    sections: buildSections(items),
    isLoading: isLoadingSpecimens || isLoadingResults,
    totalCount: items.length,
    refresh,
    isRefreshing,
  };
}
