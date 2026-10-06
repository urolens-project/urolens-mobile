import { act, renderHook } from '@testing-library/react-native';
import { Q } from '@nozbe/watermelondb';

import { database } from '@db/database';
import { apiClient } from '@lib/apiClient';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useUserId } from '@lib/auth/authStore';
import { PendingSyncAction, PendingSyncStatus } from '@app-types/enums';

import { useManualOverride } from '@features/manual-override/hooks/useManualOverride';

jest.mock('@db/database', () => ({
  database: { get: jest.fn(), write: jest.fn((work) => work()), batch: jest.fn() },
}));
jest.mock('@lib/apiClient', () => ({ apiClient: { post: jest.fn() } }));
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));
jest.mock('@lib/auth/authStore', () => ({ useUserId: jest.fn() }));

const payload = {
  parameter: 'wbc',
  originalAiValue: 12,
  correctedValue: 8,
  rationale: 'Manual recount',
};
const response = {
  id: 'ov-1',
  resultId: 'result-123',
  ...payload,
  overriddenBy: 'user-456',
  overriddenAt: '2026-10-06T10:00:00Z',
};
const mockResult = { serverId: 'result-123', status: 'PENDING_CONFIRM', aiFindings: { wbc: 12 } };
const mockResultFetch = jest.fn();
const mockOverrideFetch = jest.fn();
const mockOverridePrepare = jest.fn();
const mockPendingPrepare = jest.fn();
const mockPersisted: Record<string, unknown>[] = [];

beforeEach((): void => {
  jest.clearAllMocks();
  Object.assign(Q, { sortBy: jest.fn(() => ({})), take: jest.fn(() => ({})), desc: 'desc' });
  mockResult.status = 'PENDING_CONFIRM';
  mockResultFetch.mockResolvedValue([mockResult]);
  mockOverrideFetch.mockResolvedValue([]);
  mockPersisted.length = 0;
  mockOverridePrepare.mockImplementation((configure): Record<string, unknown> => {
    const row = {};
    configure(row);
    return row;
  });
  mockPendingPrepare.mockImplementation((configure): Record<string, unknown> => {
    const row = {};
    configure(row);
    return row;
  });
  (database.batch as jest.Mock).mockImplementation(async (...rows): Promise<void> => {
    mockPersisted.push(...rows.filter(Boolean));
  });
  (database.get as jest.Mock).mockImplementation((table): unknown => {
    if (table === 'analysis_results') return { query: () => ({ fetch: mockResultFetch }) };
    if (table === 'manual_overrides')
      return { query: () => ({ fetch: mockOverrideFetch }), prepareCreate: mockOverridePrepare };
    return { prepareCreate: mockPendingPrepare };
  });
  (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
  (useUserId as jest.Mock).mockReturnValue('user-456');
  (apiClient.post as jest.Mock).mockResolvedValue({ data: response });
});

describe('manual override submission', () => {
  it('returns success and persists the server response for immediate display', async () => {
    const { result } = renderHook(() => useManualOverride());
    let success;
    await act(async (): Promise<void> => {
      success = await result.current.submitOverride('result-123', payload);
    });
    expect(success).toBe(true);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/results/result-123/override',
      payload,
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(mockPersisted[0]).toMatchObject({
      ...payload,
      resultId: 'result-123',
      serverId: 'ov-1',
      isSynced: true,
      overriddenBy: 'user-456',
      createdAt: Date.parse(response.overriddenAt),
    });
    expect(mockPendingPrepare).not.toHaveBeenCalled();
  });

  it('uses stored AI findings rather than a supplied original value', async () => {
    const { result } = renderHook(() => useManualOverride());
    await act(async (): Promise<void> => {
      await result.current.submitOverride('result-123', { ...payload, originalAiValue: 999 });
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ originalAiValue: 12 }),
      expect.anything(),
    );
  });

  it('stores the server-authoritative AI value, author, corrected value and rationale', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        ...response,
        originalAiValue: 14,
        correctedValue: 7,
        overriddenBy: 'server-user',
        rationale: 'Server-normalized rationale',
      },
    });
    const { result } = renderHook(() => useManualOverride());
    await act(async (): Promise<void> => {
      await result.current.submitOverride('result-123', payload);
    });
    expect(mockPersisted[0]).toMatchObject({
      originalAiValue: 14,
      correctedValue: 7,
      overriddenBy: 'server-user',
      rationale: 'Server-normalized rationale',
    });
  });

  it('keeps an API failure retryable and writes nothing locally', async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce({ message: 'Server unavailable' });
    const { result } = renderHook(() => useManualOverride());
    let success;
    await act(async (): Promise<void> => {
      success = await result.current.submitOverride('result-123', payload);
    });
    expect(success).toBe(false);
    expect(result.current.error).toBe('Server unavailable');
    expect(mockPersisted).toHaveLength(0);
    await act(async (): Promise<void> => {
      success = await result.current.submitOverride('result-123', payload);
    });
    expect(success).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('retries local storage after server acceptance without submitting twice', async () => {
    (database.batch as jest.Mock).mockRejectedValueOnce(new Error('Storage unavailable'));
    const { result } = renderHook(() => useManualOverride());
    await act(async (): Promise<void> => {
      expect(await result.current.submitOverride('result-123', payload)).toBe(false);
    });
    expect(result.current.error).toBe('Storage unavailable');
    await act(async (): Promise<void> => {
      expect(await result.current.submitOverride('result-123', payload)).toBe(true);
    });
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(mockPersisted).toHaveLength(1);
  });

  it('guards rapid duplicate calls before React can disable the form', async () => {
    let finish!: (value: unknown) => void;
    (apiClient.post as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve): void => {
          finish = resolve;
        }),
    );
    const { result } = renderHook(() => useManualOverride());
    let first!: Promise<boolean>;
    await act(async (): Promise<void> => {
      first = result.current.submitOverride('result-123', payload);
      expect(await result.current.submitOverride('result-123', payload)).toBe(false);
    });
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(true);
    await act(async (): Promise<void> => {
      finish({ data: response });
      expect(await first).toBe(true);
    });
  });

  it('validates offline counts and rationale before any database write', async () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    const { result } = renderHook(() => useManualOverride());
    for (const invalid of [
      { correctedValue: -1 },
      { correctedValue: 1.5 },
      { correctedValue: Infinity },
      { correctedValue: NaN },
      { correctedValue: 301 },
      { rationale: '   ' },
      { rationale: 'a'.repeat(2001) },
    ]) {
      await act(async (): Promise<void> => {
        expect(await result.current.submitOverride('result-123', { ...payload, ...invalid })).toBe(
          false,
        );
      });
    }
    expect(database.batch).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it.each(['PENDING_SUPERVISOR_APPROVAL', 'APPROVED', 'RELEASED', 'CRITICAL_ESCALATED'])(
    'blocks %s results',
    async (status): Promise<void> => {
      mockResult.status = status;
      const { result } = renderHook(() => useManualOverride());
      await act(async (): Promise<void> => {
        expect(await result.current.submitOverride('result-123', payload)).toBe(false);
      });
      expect(apiClient.post).not.toHaveBeenCalled();
      expect(database.batch).not.toHaveBeenCalled();
      expect(result.current.error).toMatch(/no longer editable/);
    },
  );

  it('allows returned results to be corrected', async () => {
    mockResult.status = 'RETURNED_FOR_CORRECTION';
    const { result } = renderHook(() => useManualOverride());
    await act(async (): Promise<void> => {
      expect(await result.current.submitOverride('result-123', payload)).toBe(true);
    });
  });

  it('rejects missing findings instead of inventing an original value', async () => {
    mockResultFetch.mockResolvedValue([]);
    const { result } = renderHook(() => useManualOverride());
    await act(async (): Promise<void> => {
      expect(await result.current.submitOverride('result-123', payload)).toBe(false);
    });
    expect(result.current.error).toMatch(/original AI finding is unavailable/);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('requires a signed-in author for local corrections', async () => {
    (useUserId as jest.Mock).mockReturnValue(null);
    const { result } = renderHook(() => useManualOverride());
    await act(async (): Promise<void> => {
      expect(await result.current.submitOverride('result-123', payload)).toBe(false);
    });
    expect(database.batch).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('rejects unchanged corrections but permits restoring the original AI value', async () => {
    mockOverrideFetch.mockResolvedValue([{ correctedValue: 8 }]);
    const { result } = renderHook(() => useManualOverride());
    await act(async (): Promise<void> => {
      expect(await result.current.submitOverride('result-123', payload)).toBe(false);
    });
    expect(apiClient.post).not.toHaveBeenCalled();
    await act(async (): Promise<void> => {
      expect(
        await result.current.submitOverride('result-123', { ...payload, correctedValue: 12 }),
      ).toBe(true);
    });
  });

  it('atomically saves an offline correction and its sync entry, including zero counts', async () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    const { result } = renderHook(() => useManualOverride());
    await act(async (): Promise<void> => {
      expect(
        await result.current.submitOverride('result-123', {
          ...payload,
          correctedValue: 0,
          rationale: '  False positive  ',
        }),
      ).toBe(true);
    });
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(database.batch).toHaveBeenCalledTimes(1);
    expect(mockPersisted[0]).toMatchObject({
      originalAiValue: 12,
      correctedValue: 0,
      rationale: 'False positive',
      isSynced: false,
      overriddenBy: 'user-456',
    });
    expect(mockPersisted[1]).toMatchObject({
      entityId: 'result-123',
      action: PendingSyncAction.OVERRIDE_PARAMETER,
      status: PendingSyncStatus.PENDING,
    });
    expect(JSON.parse(mockPersisted[1].payloadJson as string)).toEqual({
      ...payload,
      correctedValue: 0,
      rationale: 'False positive',
    });
  });

  it('reports failure if the offline batch cannot be committed', async () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    (database.batch as jest.Mock).mockRejectedValueOnce(new Error('Disk full'));
    const { result } = renderHook(() => useManualOverride());
    await act(async (): Promise<void> => {
      expect(await result.current.submitOverride('result-123', payload)).toBe(false);
    });
    expect(result.current.error).toBe('Disk full');
    expect(mockPersisted).toHaveLength(0);
  });
});
