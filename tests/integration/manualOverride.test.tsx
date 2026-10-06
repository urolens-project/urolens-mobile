import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Q } from '@nozbe/watermelondb';

import { database } from '@db/database';
import { apiClient } from '@lib/apiClient';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { PendingSyncAction, PendingSyncStatus } from '@app-types/enums';

import { OverrideEntryForm } from '@features/manual-override/components/OverrideEntryForm';
import { AIFindingsPanel } from '@features/result-confirmation/components/AIFindingsPanel';

jest.mock('@db/database', () => ({
  database: { get: jest.fn(), write: jest.fn((work) => work()), batch: jest.fn() },
}));
jest.mock('@lib/apiClient', () => ({ apiClient: { post: jest.fn() } }));
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));
jest.mock('@lib/auth/authStore', () => ({ useUserId: () => 'medtech-int-01' }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('@components/OfflineBanner', () => ({ OfflineBanner: () => null }));
jest.mock('@nozbe/watermelondb/hooks', () => ({
  useDatabase: () => require('@db/database').database,
}));

interface MockRow {
  table: string;
  [key: string]: unknown;
}
interface MockWhere {
  field?: string;
  value?: string;
  direction?: string;
  take?: number;
}
interface Observer {
  table: string;
  read: () => MockRow[];
  receive: (rows: MockRow[]) => void;
}
const resultId = 'result-int-02';
const specimenId = 'specimen-local-02';
const mockAnalysisResult = {
  table: 'analysis_results',
  serverId: resultId,
  status: 'PENDING_CONFIRM',
  aiFindings: { wbc: 18 },
};
const mockOverrides: MockRow[] = [];
const mockPending: MockRow[] = [];
const mockObservers: Observer[] = [];
const mockOverridePrepare = jest.fn();
const mockPendingPrepare = jest.fn();
const response = {
  id: 'ov-int-01',
  resultId,
  parameter: 'wbc',
  originalAiValue: 18,
  correctedValue: 10,
  rationale: 'Manual recount',
  overriddenBy: 'medtech-int-01',
  overriddenAt: '2026-10-06T10:00:00Z',
};

function notify(table: string): void {
  mockObservers
    .filter((observer): boolean => observer.table === table)
    .forEach((observer): void => observer.receive(observer.read()));
}

function makeCollection(table: string): unknown {
  return {
    prepareCreate: table === 'manual_overrides' ? mockOverridePrepare : mockPendingPrepare,
    query: (...conditions: MockWhere[]): unknown => {
      const read = (): MockRow[] => {
        if (table === 'analysis_results') return [mockAnalysisResult];
        let rows = mockOverrides.filter((row): boolean =>
          conditions.every(
            (condition): boolean =>
              !condition.value ||
              row[condition.field === 'result_id' ? 'resultId' : condition.field!] ===
                condition.value,
          ),
        );
        const sort = conditions.find((condition): boolean => !!condition.direction);
        if (sort)
          rows = [...rows].sort((a, b): number =>
            sort.direction === 'desc'
              ? Number(b.createdAt) - Number(a.createdAt)
              : Number(a.createdAt) - Number(b.createdAt),
          );
        const limit = conditions.find((condition): boolean => !!condition.take);
        return limit ? rows.slice(0, limit.take) : rows;
      };
      const subscribe = (receive: (rows: MockRow[]) => void): { unsubscribe: () => void } => {
        const observer = { table, read, receive };
        mockObservers.push(observer);
        receive(read());
        return {
          unsubscribe: (): void => {
            mockObservers.splice(mockObservers.indexOf(observer), 1);
          },
        };
      };
      return {
        fetch: async (): Promise<MockRow[]> => read(),
        observe: () => ({ subscribe }),
        observeWithColumns: () => ({ subscribe }),
      };
    },
  };
}

beforeEach((): void => {
  jest.clearAllMocks();
  mockOverrides.length = 0;
  mockPending.length = 0;
  mockObservers.length = 0;
  mockAnalysisResult.status = 'PENDING_CONFIRM';
  mockAnalysisResult.aiFindings = { wbc: 18 };
  (Q.where as jest.Mock).mockImplementation((field, value): MockWhere => ({ field, value }));
  (Q.sortBy as jest.Mock).mockImplementation(
    (field, direction): MockWhere => ({ field, direction }),
  );
  (Q.take as jest.Mock).mockImplementation((take): MockWhere => ({ take }));
  mockOverridePrepare.mockImplementation((configure): MockRow => {
    const row: MockRow = { table: 'manual_overrides' };
    configure(row);
    return row;
  });
  mockPendingPrepare.mockImplementation((configure): MockRow => {
    const row: MockRow = { table: 'pending_sync' };
    configure(row);
    return row;
  });
  (database.get as jest.Mock).mockImplementation(makeCollection);
  (database.batch as jest.Mock).mockImplementation(async (...rows): Promise<void> => {
    rows.filter(Boolean).forEach((row: MockRow): void => {
      if (row.table === 'manual_overrides') mockOverrides.push(row);
      else mockPending.push(row);
    });
    notify('manual_overrides');
  });
  (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
  (apiClient.post as jest.Mock).mockResolvedValue({ data: response });
});

async function openForm(): Promise<ReturnType<typeof render>> {
  const view = render(
    <OverrideEntryForm resultId={resultId} specimenId={specimenId} parameter="wbc" />,
  );
  await waitFor((): void => {
    expect(view.getByLabelText('Corrected value').props.editable).toBe(true);
  });
  return view;
}

function fillForm(
  view: ReturnType<typeof render>,
  count = '10',
  rationale = 'Manual recount',
): void {
  fireEvent.changeText(view.getByLabelText('Corrected value'), count);
  fireEvent.changeText(view.getByLabelText('Rationale for override'), rationale);
}

describe('override editor with real feature hooks', () => {
  it('submits a correction and displays it in the result with the original AI count preserved', async () => {
    const view = await openForm();
    fillForm(view);
    await act(async (): Promise<void> => {
      fireEvent.press(view.getByRole('button', { name: 'Submit Override' }));
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      `/results/${resultId}/override`,
      {
        parameter: 'wbc',
        originalAiValue: 18,
        correctedValue: 10,
        rationale: 'Manual recount',
      },
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(mockOverrides[0]).toMatchObject({
      serverId: 'ov-int-01',
      overriddenBy: 'medtech-int-01',
      isSynced: true,
      originalAiValue: 18,
      correctedValue: 10,
    });
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/(medtech)/sample/[id]',
      params: { id: specimenId, resultId },
    });
    view.unmount();
    const review = render(
      <AIFindingsPanel
        resultId={resultId}
        findings={[{ parameter: 'wbc', count: 18, isAnomalous: true }]}
        onOverride={jest.fn()}
        isConfirmed={false}
      />,
    );
    expect(review.getByText('10')).toBeTruthy();
    expect(review.getByText('Overridden · AI: 18')).toBeTruthy();
  });

  it('keeps entered values on API failure and returns only after a successful retry', async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce({ message: 'Gateway timeout' });
    const view = await openForm();
    fillForm(view);
    await act(async (): Promise<void> => {
      fireEvent.press(view.getByRole('button', { name: 'Submit Override' }));
    });
    expect(view.getByText('Gateway timeout')).toBeTruthy();
    expect(view.getByLabelText('Corrected value').props.value).toBe('10');
    expect(view.getByLabelText('Rationale for override').props.value).toBe('Manual recount');
    expect(router.replace).not.toHaveBeenCalled();
    expect(mockOverrides).toHaveLength(0);
    await act(async (): Promise<void> => {
      fireEvent.press(view.getByRole('button', { name: 'Submit Override' }));
    });
    expect(mockOverrides).toHaveLength(1);
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('queues an offline zero-count correction and its rationale together before returning', async () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    const view = await openForm();
    fillForm(view, '0', '  False-positive detections  ');
    await act(async (): Promise<void> => {
      fireEvent.press(view.getByRole('button', { name: 'Queue Override' }));
    });
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(mockOverrides[0]).toMatchObject({
      originalAiValue: 18,
      correctedValue: 0,
      rationale: 'False-positive detections',
      isSynced: false,
    });
    expect(mockPending[0]).toMatchObject({
      entityId: resultId,
      action: PendingSyncAction.OVERRIDE_PARAMETER,
      status: PendingSyncStatus.PENDING,
    });
    expect(JSON.parse(mockPending[0].payloadJson as string)).toMatchObject({
      correctedValue: 0,
      rationale: 'False-positive detections',
    });
    expect(database.batch).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith('Override queued', expect.any(String));
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('stays in the form when the offline transaction fails and retries without a partial correction', async () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    (database.batch as jest.Mock).mockRejectedValueOnce(new Error('Disk full'));
    const view = await openForm();
    fillForm(view);
    await act(async (): Promise<void> => {
      fireEvent.press(view.getByRole('button', { name: 'Queue Override' }));
    });
    expect(mockOverrides).toHaveLength(0);
    expect(mockPending).toHaveLength(0);
    expect(router.replace).not.toHaveBeenCalled();
    expect(view.getByText('Disk full')).toBeTruthy();
    await act(async (): Promise<void> => {
      fireEvent.press(view.getByRole('button', { name: 'Queue Override' }));
    });
    expect(mockOverrides).toHaveLength(1);
    expect(mockPending).toHaveLength(1);
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('prevents duplicate submissions while the request is in flight', async () => {
    let finish!: (value: unknown) => void;
    (apiClient.post as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve): void => {
          finish = resolve;
        }),
    );
    const view = await openForm();
    fillForm(view);
    await act(async (): Promise<void> => {
      const submit = view.getByRole('button', { name: 'Submit Override' });
      fireEvent.press(submit);
      fireEvent.press(submit);
    });
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(view.getByLabelText('Corrected value').props.editable).toBe(false);
    expect(router.replace).not.toHaveBeenCalled();
    await act(async (): Promise<void> => {
      finish({ data: response });
    });
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('preserves the original value on a second correction and uses the newest correction for validation', async () => {
    mockOverrides.push({
      table: 'manual_overrides',
      resultId,
      parameter: 'wbc',
      correctedValue: 9,
      originalAiValue: 18,
      createdAt: 10,
    });
    mockOverrides.unshift({
      table: 'manual_overrides',
      resultId,
      parameter: 'wbc',
      correctedValue: 10,
      originalAiValue: 18,
      createdAt: 20,
    });
    const view = await openForm();
    expect(view.getByText('Current corrected value: 10')).toBeTruthy();
    expect(view.getByLabelText('Original AI value: 18')).toBeTruthy();
    fillForm(view);
    expect(view.getByRole('button', { name: 'Submit Override' })).toBeDisabled();
    fillForm(view, '18', 'Restoring the original after recount');
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { ...response, correctedValue: 18, rationale: 'Restoring the original after recount' },
    });
    await act(async (): Promise<void> => {
      fireEvent.press(view.getByRole('button', { name: 'Submit Override' }));
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ originalAiValue: 18, correctedValue: 18 }),
      expect.anything(),
    );
  });

  it('updates the displayed original finding when the same local model changes', async () => {
    const view = await openForm();
    act((): void => {
      mockAnalysisResult.aiFindings = { wbc: 24 };
      notify('analysis_results');
    });
    expect(view.getByLabelText('Original AI value: 24')).toBeTruthy();
    expect(view.queryByLabelText('Original AI value: 18')).toBeNull();
  });

  it('blocks submission if a sync finalizes the open result', async () => {
    const view = await openForm();
    fillForm(view);
    act((): void => {
      mockAnalysisResult.status = 'RELEASED';
      notify('analysis_results');
    });
    expect(view.getByText(/no longer editable/)).toBeTruthy();
    expect(view.getByRole('button', { name: 'Submit Override' })).toBeDisabled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
