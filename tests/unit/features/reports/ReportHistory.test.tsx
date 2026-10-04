import React from 'react';
import { Text, View } from 'react-native';

import { act, fireEvent, render, renderHook } from '@testing-library/react-native';

import { ReportFilters } from '@features/reports/components/ReportFilters';
import { ReportDataNotice } from '@features/reports/components/ReportDataNotice';
import { ReportsScreen } from '@features/reports/components/ReportsScreen';
import { useReportFilters } from '@features/reports/hooks/useReportFilters';
import { useReports } from '@features/reports/hooks/useReports';
import type { ReportItem } from '@features/reports/types';

const mockPush = jest.fn();
jest.mock('expo-router', (): object => ({
  useRouter: (): object => ({ push: mockPush }),
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-safe-area-context', (): object => ({
  useSafeAreaInsets: (): object => ({ top: 0 }),
}));
jest.mock('@lib/auth/authStore', (): object => ({ useUsername: (): string => 'MedTech' }));
jest.mock('@hooks/useNetworkStatus', (): object => ({
  useNetworkStatus: (): object => ({ isOnline: false }),
}));
jest.mock('@components/DropReveal', (): object => ({ useReduceMotion: (): boolean => true }));
jest.mock('@features/reports/hooks/useReports', (): object => ({ useReports: jest.fn() }));
jest.mock('@features/reports/components/ReportsLandingView', (): object => ({
  ReportsLandingView: ({
    onSelectCategory,
  }: {
    onSelectCategory: (category: string) => void;
  }): React.JSX.Element =>
    require('react').createElement(
      'Text',
      { onPress: (): void => onSelectCategory('RELEASED') },
      'Released',
    ),
}));
jest.mock('@features/reports/components/CategoryDrilldownView', (): object => ({
  CategoryDrilldownView: ({
    onItemPress,
  }: {
    onItemPress: (id: string) => void;
  }): React.JSX.Element =>
    require('react').createElement(
      'Text',
      { onPress: (): void => onItemPress('spec-1') },
      'SAMPLE-001',
    ),
}));

function makeItem(overrides: Partial<ReportItem> = {}): ReportItem {
  return {
    id: 'spec-1',
    sampleUid: 'SAMPLE-001',
    patientUid: 'PT-001',
    testType: 'Urinalysis',
    priorityLevel: null,
    category: 'RELEASED',
    receivedAt: new Date(2026, 9, 4, 8).toISOString(),
    finalizedAt: new Date(2026, 9, 4, 9).toISOString(),
    rejectionReason: null,
    ...overrides,
  };
}

interface HistoryHarnessProps {
  items: ReportItem[];
}

function HistoryHarness({ items }: HistoryHarnessProps): React.JSX.Element {
  const filters = useReportFilters(items);
  return (
    <View>
      <ReportFilters
        searchQuery={filters.searchQuery}
        period={filters.period}
        visibleCount={filters.filteredItems.length}
        totalCount={items.length}
        hasFilters={filters.hasFilters}
        onChangeSearch={filters.changeSearch}
        onChangePeriod={filters.changePeriod}
        onReset={filters.resetFilters}
      />
      {filters.filteredItems.map(
        (item): React.JSX.Element => (
          <Text key={item.id}>{item.sampleUid}</Text>
        ),
      )}
    </View>
  );
}

beforeEach((): void => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 4, 12));
});
afterEach((): void => {
  jest.useRealTimers();
});

describe('report history filters', (): void => {
  it('includes old records by default and searches sample, patient, and test identifiers', (): void => {
    const item = makeItem({ receivedAt: '2020-01-01T00:00:00Z' });
    const { result } = renderHook(() => useReportFilters([item]));
    expect(result.current.period).toBe('ALL');
    expect(result.current.filteredItems).toEqual([item]);
    for (const query of [' sample-001 ', 'pt-001', 'URINALYSIS']) {
      act((): void => {
        result.current.changeSearch(query);
      });
      expect(result.current.filteredItems).toEqual([item]);
    }
    act((): void => {
      result.current.changeSearch('missing');
    });
    expect(result.current.filteredItems).toEqual([]);
  });

  it('includes today and the previous six local calendar days, excluding future and older records', (): void => {
    const firstDay = makeItem({ id: 'boundary', receivedAt: new Date(2026, 8, 28).toISOString() });
    const tooOld = makeItem({
      id: 'old',
      receivedAt: new Date(2026, 8, 27, 23, 59, 59).toISOString(),
    });
    const tomorrow = makeItem({ id: 'future', receivedAt: new Date(2026, 9, 5).toISOString() });
    const invalid = makeItem({ id: 'invalid', receivedAt: 'invalid' });
    const today = makeItem();
    const { result } = renderHook(() =>
      useReportFilters([today, firstDay, tooOld, tomorrow, invalid]),
    );
    act((): void => {
      result.current.changePeriod('LAST_7_DAYS');
    });
    expect(result.current.filteredItems).toEqual([today, firstDay]);
  });

  it('combines search and thirty-day receipt filtering while keeping the existing order', (): void => {
    const first = makeItem({ id: 'first', patientUid: 'PAT-MATCH' });
    const boundary = makeItem({
      id: 'boundary',
      patientUid: 'PAT-MATCH',
      receivedAt: new Date(2026, 8, 5).toISOString(),
    });
    const old = makeItem({
      id: 'old',
      patientUid: 'PAT-MATCH',
      receivedAt: new Date(2026, 8, 4, 23, 59, 59).toISOString(),
    });
    const other = makeItem({ id: 'other' });
    const { result } = renderHook(() => useReportFilters([first, boundary, old, other]));
    act((): void => {
      result.current.changePeriod('LAST_30_DAYS');
      result.current.changeSearch('pat-match');
    });
    expect(result.current.filteredItems).toEqual([first, boundary]);
    act((): void => {
      result.current.resetFilters();
    });
    expect(result.current.filteredItems).toEqual([first, boundary, old, other]);
    expect(result.current.hasFilters).toBe(false);
  });

  it('applies the active filter to updated reports', (): void => {
    const initial = makeItem();
    const match = makeItem({ id: 'new', patientUid: 'PAT-NEW' });
    const { result, rerender } = renderHook(
      ({ items }: HistoryHarnessProps) => useReportFilters(items),
      {
        initialProps: { items: [initial] },
      },
    );
    act((): void => {
      result.current.changeSearch('PAT-NEW');
    });
    expect(result.current.filteredItems).toEqual([]);
    rerender({ items: [initial, match] });
    expect(result.current.filteredItems).toEqual([match]);
  });

  it('supports search, date selection, matching counts, and clearing filters through the controls', (): void => {
    const recent = makeItem();
    const historical = makeItem({
      id: 'old',
      sampleUid: 'SAMPLE-OLD',
      receivedAt: '2020-01-01T00:00:00Z',
    });
    const view = render(<HistoryHarness items={[recent, historical]} />);
    expect(view.getByText('2 of 2 samples')).toBeTruthy();
    fireEvent.press(view.getByText('Last 7 days'));
    expect(view.getByText('1 of 2 samples')).toBeTruthy();
    expect(view.queryByText('SAMPLE-OLD')).toBeNull();
    fireEvent.changeText(view.getByLabelText('Search reports'), 'missing');
    expect(view.getByText('0 of 2 samples')).toBeTruthy();
    fireEvent.press(view.getByText('Clear filters'));
    expect(view.getByText('SAMPLE-OLD')).toBeTruthy();
    expect(view.queryByText('Clear filters')).toBeNull();
  });
});

describe('report browsing feedback', (): void => {
  it('opens report details in read-only mode while offline', (): void => {
    (useReports as jest.Mock).mockReturnValue({
      sections: [{ category: 'RELEASED', title: 'Released', data: [makeItem()] }],
      totalCount: 1,
      isLoading: false,
      error: null,
      isRefreshing: false,
      refresh: jest.fn(),
    });
    const view = render(<ReportsScreen />);
    fireEvent.press(view.getByText('Released'));
    fireEvent.press(view.getByText('SAMPLE-001'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(medtech)/sample/[id]',
      params: { id: 'spec-1', readOnly: 'true' },
    });
  });

  it('shows a loading notice and surfaces an update failure', (): void => {
    const view = render(<ReportDataNotice isLoading hasError={false} />);
    expect(view.getByText('Loading reports…')).toBeTruthy();
    view.rerender(<ReportDataNotice isLoading={false} hasError />);
    expect(view.queryByText('Loading reports…')).toBeNull();
    expect(view.getByText(/Reports could not be updated/)).toBeTruthy();
  });
});
