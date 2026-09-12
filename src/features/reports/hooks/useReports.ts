import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
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

const FINISHED_RESULT_STATUSES: ResultStatus[] = [
  'PENDING_SUPERVISOR_APPROVAL',
  'APPROVED',
  'RELEASED',
];

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

function buildSections(specimens: Specimen[], results: AnalysisResult[]): ReportSection[] {
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

  for (const r of results) {
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
    const subscription = database
      .get<Specimen>('specimens')
      .query()
      .observe()
      .subscribe((rows) => {
        setSpecimens(rows);
        setIsLoadingSpecimens(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const subscription = database
      .get<AnalysisResult>('analysis_results')
      .query(Q.where('status', Q.oneOf(FINISHED_RESULT_STATUSES)))
      .observe()
      .subscribe((rows) => {
        setResults(rows);
        setIsLoadingResults(false);
      });

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

  return {
    sections: buildSections(specimens, results),
    isLoading: isLoadingSpecimens || isLoadingResults,
    totalCount: specimens.filter((s) => s.status === 'REJECTED').length + results.length,
    refresh,
    isRefreshing,
  };
}
