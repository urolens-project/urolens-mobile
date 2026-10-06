import { useCallback, useState } from 'react';

import { REPORT_PERIOD_OPTIONS } from '../constants/reportHistory.constant';
import type { ReportItem, ReportPeriod } from '../types';

interface UseReportFiltersResult {
  searchQuery: string;
  period: ReportPeriod;
  filteredItems: ReportItem[];
  hasFilters: boolean;
  changeSearch: (query: string) => void;
  changePeriod: (period: ReportPeriod) => void;
  resetFilters: () => void;
}

function filterItems(items: ReportItem[], query: string, period: ReportPeriod): ReportItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  const days = REPORT_PERIOD_OPTIONS.find((option): boolean => option.value === period)?.days;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  if (days) start.setDate(start.getDate() - days + 1);

  return items.filter((item): boolean => {
    const matchesQuery = [item.sampleUid, item.patientUid, item.testType].some((value): boolean =>
      value.toLowerCase().includes(normalizedQuery),
    );
    if (!matchesQuery) return false;
    if (!days) return true;
    const receivedAt = new Date(item.receivedAt).getTime();
    return receivedAt >= start.getTime() && receivedAt < end.getTime();
  });
}

/**
 * @description Narrows cached history without a network request; all dates is
 * the default so older completed samples remain discoverable.
 * @param items - The selected category's reports, already sorted newest first.
 */
export function useReportFilters(items: ReportItem[]): UseReportFiltersResult {
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<ReportPeriod>('ALL');
  const filteredItems = filterItems(items, searchQuery, period);
  const hasFilters = searchQuery.trim().length > 0 || period !== 'ALL';

  const handleChangeSearch = useCallback((query: string): void => setSearchQuery(query), []);
  const handleChangePeriod = useCallback((value: ReportPeriod): void => setPeriod(value), []);
  const handleResetFilters = useCallback((): void => {
    setSearchQuery('');
    setPeriod('ALL');
  }, []);

  return {
    searchQuery,
    period,
    filteredItems,
    hasFilters,
    changeSearch: handleChangeSearch,
    changePeriod: handleChangePeriod,
    resetFilters: handleResetFilters,
  };
}
