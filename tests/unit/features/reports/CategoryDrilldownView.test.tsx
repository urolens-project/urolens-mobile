import React from 'react';

import { act, render } from '@testing-library/react-native';

import apiClient from '@lib/apiClient';

import { CategoryDrilldownView } from '@features/reports/components/CategoryDrilldownView';
import type { ReportItem, ReportSection } from '@features/reports/types';

jest.mock('@lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const getMock = apiClient.get as jest.Mock;

function makeLocalItem(overrides: Partial<ReportItem> = {}): ReportItem {
  return {
    id: 'local-spec-1',
    specimenId: 'srv-1',
    sampleUid: 'SAMPLE-001',
    patientUid: 'PT-001',
    testType: 'Urinalysis',
    priorityLevel: null,
    category: 'RELEASED',
    receivedAt: '2026-10-01T00:00:00Z',
    finalizedAt: '2026-10-01T00:00:00Z',
    rejectionReason: null,
    ...overrides,
  };
}

function makeSection(data: ReportItem[]): ReportSection {
  return { category: 'RELEASED', title: 'Released', data };
}

const noop = async (): Promise<void> => {};

// FlatList is a host stub in the jest setup and never renders `data` through `renderItem`,
// so read its props directly instead (same approach as QueueScreen.test.tsx).
type Screen = ReturnType<typeof render>;
const listOf = (view: Screen) => view.UNSAFE_root.findByType('FlatList' as never);

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('CategoryDrilldownView load-older history', () => {
  it('does not duplicate a sample the server re-lists on the first history page', async () => {
    getMock.mockResolvedValue({
      data: {
        items: [
          // Already shown locally (synced, within the device's window) — must be skipped.
          {
            specimenId: 'srv-1',
            resultId: 'res-1',
            sampleUid: 'SAMPLE-001',
            patientUid: 'PT-001',
            testType: 'URINALYSIS',
            priorityLevel: 'ROUTINE',
            receivedAt: '2026-09-20T00:00:00Z',
            category: 'RELEASED',
            finalizedAt: '2026-09-20T00:00:00Z',
            rejectionReason: null,
          },
          // Genuinely older than the local window — must be kept.
          {
            specimenId: 'srv-2',
            resultId: 'res-2',
            sampleUid: 'SAMPLE-002',
            patientUid: 'PT-002',
            testType: 'URINALYSIS',
            priorityLevel: 'ROUTINE',
            receivedAt: '2026-09-10T00:00:00Z',
            category: 'RELEASED',
            finalizedAt: '2026-09-10T00:00:00Z',
            rejectionReason: null,
          },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      },
    });

    const section = makeSection([makeLocalItem()]);
    const view = render(
      <CategoryDrilldownView
        category="RELEASED"
        section={section}
        topInset={0}
        playKey={0}
        reduceMotion
        isOnline
        isLoading={false}
        hasError={false}
        isRefreshing={false}
        onRefresh={noop}
        onBack={jest.fn()}
        onItemPress={jest.fn()}
      />,
    );

    expect(listOf(view).props.data).toEqual([expect.objectContaining({ sampleUid: 'SAMPLE-001' })]);

    const footer = listOf(view).props.ListFooterComponent;
    await act(async () => {
      footer.props.onPress();
      await Promise.resolve();
    });

    const sampleUids = listOf(view).props.data.map((item: ReportItem) => item.sampleUid);
    expect(sampleUids).toEqual(['SAMPLE-001', 'SAMPLE-002']);
    // Both server rows are now accounted for, so the button goes away.
    expect(listOf(view).props.ListFooterComponent).toBeNull();
  });
});
