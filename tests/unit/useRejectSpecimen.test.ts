import { act, renderHook } from '@testing-library/react-native';

import { database } from '@db/database';
import { apiClient } from '@lib/apiClient';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { authStoreApi } from '@lib/auth/authStore';
import { RejectionReason } from '@app-types/enums';
import {
  useRejectSpecimen,
  type RejectResult,
} from '@features/specimen-rejection/hooks/useRejectSpecimen';

jest.mock('@nozbe/watermelondb', () => ({ Model: class {}, Q: { where: jest.fn() } }));
jest.mock('@db/database', () => ({
  database: { get: jest.fn(), write: jest.fn(), batch: jest.fn() },
}));
jest.mock('@lib/apiClient', () => ({ apiClient: { post: jest.fn() } }));
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));
jest.mock('@lib/auth/authStore', () => ({ authStoreApi: { getUserId: jest.fn() } }));

const receipt = { specimenId: 'srv-1', status: 'REJECTED', rejectedAt: '2026-10-06T02:00:00Z' };

function setupDb(overrides: Record<string, unknown> = {}, resultStatus: string | null = null) {
  const raw: Record<string, unknown> = {
    status: 'ASSIGNED',
    rejectionReason: null,
    rejectionNote: null,
    rejectedAt: null,
  };
  const specimen = {
    id: 'local-1',
    serverId: 'srv-1',
    medtechId: 'medtech-1',
    _raw: raw,
    _preparedState: null,
    ...overrides,
    prepareUpdate: jest.fn(),
  };
  for (const key of Object.keys(raw)) {
    Object.defineProperty(specimen, key, {
      get: () => specimen._raw[key],
      set: (value: unknown) => {
        specimen._raw[key] = value;
      },
    });
  }
  specimen.prepareUpdate.mockImplementation((callback) => {
    callback(specimen);
    return specimen;
  });
  const prepareCreate = jest.fn((callback) => {
    const pending = {};
    callback(pending);
    return pending;
  });
  const fetch = jest.fn().mockResolvedValue(
    resultStatus
      ? [
          {
            specimenId: 'srv-1',
            status: resultStatus,
            createdAt: 1,
          },
        ]
      : [],
  );
  (database.get as jest.Mock).mockImplementation((table: string) => {
    if (table === 'specimens') return { find: jest.fn().mockResolvedValue(specimen) };
    if (table === 'analysis_results') return { query: () => ({ fetch }) };
    return { prepareCreate };
  });
  (database.write as jest.Mock).mockImplementation((callback) => callback());
  return { specimen, prepareCreate, fetch };
}

beforeEach(() => {
  jest.resetAllMocks();
  (authStoreApi.getUserId as jest.Mock).mockReturnValue('medtech-1');
  (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
  (apiClient.post as jest.Mock).mockResolvedValue({ data: receipt });
});

async function reject(reason = RejectionReason.UNLABELED, note?: string): Promise<RejectResult> {
  const { result } = renderHook(() => useRejectSpecimen('local-1'));
  let outcome: RejectResult;
  await act(async () => {
    outcome = await result.current.reject(reason, note);
  });
  expect(result.current.isLoading).toBe(false);
  return outcome!;
}

describe('assigned specimen rejection', () => {
  it('sends a typed request with trimmed notes and saves the server timestamp', async () => {
    const { specimen, prepareCreate } = setupDb();
    expect(await reject(RejectionReason.OTHER, '  Cracked tube  ')).toEqual({
      status: 'rejected',
      isQueued: false,
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/specimens/srv-1/reject',
      { reasonCode: 'OTHER', freeTextNote: 'Cracked tube' },
      { signal: expect.any(AbortSignal) },
    );
    expect(specimen._raw).toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'OTHER',
      rejectionNote: 'Cracked tube',
      rejectedAt: receipt.rejectedAt,
    });
    expect(prepareCreate).not.toHaveBeenCalled();
    expect(database.batch).toHaveBeenCalledWith(specimen, null);
  });

  it('omits blank optional notes', async () => {
    setupDb();
    await reject(RejectionReason.UNLABELED, '  ');
    expect(apiClient.post).toHaveBeenCalledWith(
      expect.any(String),
      { reasonCode: 'UNLABELED' },
      expect.any(Object),
    );
  });

  it('queues offline rejection together with its local update in one batch', async () => {
    const { specimen, prepareCreate } = setupDb();
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    expect(await reject(RejectionReason.WRONG_CONTAINER, 'EDTA tube')).toEqual({
      status: 'rejected',
      isQueued: true,
    });
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(prepareCreate).toHaveBeenCalledTimes(1);
    const pending = prepareCreate.mock.results[0].value;
    expect(pending).toMatchObject({
      entity: 'specimens',
      entityId: 'srv-1',
      action: 'REJECT_SPECIMEN',
      status: 'PENDING',
    });
    expect(JSON.parse(pending.payloadJson)).toEqual({
      reasonCode: 'WRONG_CONTAINER',
      freeTextNote: 'EDTA tube',
    });
    expect(database.batch).toHaveBeenCalledWith(specimen, pending);
    expect(specimen._raw.rejectedAt).toMatch(/Z$/);
  });

  it.each([null, 'another-medtech'])(
    'blocks specimens not assigned to the signed-in user (%s)',
    async (medtechId) => {
      setupDb({ medtechId });
      expect(await reject()).toEqual({
        status: 'failed',
        message: 'You can only reject a specimen assigned to you.',
      });
      expect(apiClient.post).not.toHaveBeenCalled();
      expect(database.write).not.toHaveBeenCalled();
    },
  );

  it('blocks rejection after sign-out', async () => {
    setupDb();
    (authStoreApi.getUserId as jest.Mock).mockReturnValue(null);
    expect(await reject()).toMatchObject({ status: 'failed' });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('requires a synced specimen', async () => {
    setupDb({ serverId: null });
    expect(await reject()).toEqual({
      status: 'failed',
      message: 'Specimen has not been synced to the server yet.',
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it.each(['PENDING_SUPERVISOR_APPROVAL', 'CRITICAL_ESCALATED', 'APPROVED', 'RELEASED'])(
    'rechecks the latest result before rejecting (%s)',
    async (status) => {
      setupDb({}, status);
      expect(await reject()).toMatchObject({
        status: 'failed',
        message: expect.stringMatching(/submitted for supervisor review/),
      });
      expect(apiClient.post).not.toHaveBeenCalled();
      expect(database.write).not.toHaveBeenCalled();
    },
  );

  it('permits rejection after return for correction', async () => {
    setupDb({}, 'RETURNED_FOR_CORRECTION');
    expect(await reject()).toMatchObject({ status: 'rejected' });
  });

  it('rejects invalid reasons and oversized notes without sending them', async () => {
    setupDb();
    expect(await reject('INVALID' as RejectionReason)).toMatchObject({ status: 'failed' });
    expect(await reject(RejectionReason.OTHER, 'x'.repeat(501))).toMatchObject({
      status: 'failed',
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('returns the actual server error and leaves the specimen untouched for retry', async () => {
    const { specimen } = setupDb();
    (apiClient.post as jest.Mock).mockRejectedValue({
      code: 'CONFLICT',
      message: 'Specimen was reassigned.',
    });
    expect(await reject()).toEqual({ status: 'failed', message: 'Specimen was reassigned.' });
    expect(specimen.prepareUpdate).not.toHaveBeenCalled();
  });

  it('prevents a second in-flight submission', async () => {
    setupDb();
    let resolveRequest: (value: unknown) => void = () => {};
    (apiClient.post as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { result } = renderHook(() => useRejectSpecimen('local-1'));
    let first: Promise<RejectResult>;
    await act(async () => {
      first = result.current.reject(RejectionReason.UNLABELED);
      expect(await result.current.reject(RejectionReason.OTHER)).toEqual({ status: 'busy' });
    });
    expect(result.current.isLoading).toBe(true);
    await act(async () => {
      resolveRequest({ data: receipt });
      await first;
    });
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('retries a failed local save without submitting an accepted rejection again', async () => {
    const { specimen } = setupDb();
    (database.batch as jest.Mock)
      .mockRejectedValueOnce(new Error('Disk full'))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useRejectSpecimen('local-1'));
    await act(async () => {
      expect(await result.current.reject(RejectionReason.UNLABELED, 'Original note')).toMatchObject(
        {
          status: 'failed',
          message: expect.stringMatching(/server accepted/),
        },
      );
    });
    expect(result.current.hasAcceptedRejection).toBe(true);
    expect(specimen._raw.status).toBe('ASSIGNED');
    await act(async () => {
      expect(await result.current.reject(RejectionReason.OTHER, 'Changed note')).toEqual({
        status: 'rejected',
        isQueued: false,
      });
    });
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(specimen._raw).toMatchObject({
      rejectionReason: 'UNLABELED',
      rejectionNote: 'Original note',
    });
    expect(result.current.hasAcceptedRejection).toBe(false);
  });

  it('restores the local specimen if the offline batch fails, allowing a fresh retry', async () => {
    const { specimen } = setupDb();
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    (database.batch as jest.Mock).mockRejectedValueOnce(new Error('Disk full'));
    const { result } = renderHook(() => useRejectSpecimen('local-1'));
    await act(async () => {
      expect(await result.current.reject(RejectionReason.UNLABELED)).toEqual({
        status: 'failed',
        message: 'Disk full',
      });
    });
    expect(specimen._raw.status).toBe('ASSIGNED');
    await act(async () => {
      expect(await result.current.reject(RejectionReason.UNLABELED)).toEqual({
        status: 'rejected',
        isQueued: true,
      });
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('blocks an offline write if the result changes before the writer runs', async () => {
    const { specimen, fetch } = setupDb();
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    fetch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ specimenId: 'srv-1', status: 'APPROVED', createdAt: 1 }]);
    expect(await reject()).toMatchObject({ status: 'failed' });
    expect(specimen.prepareUpdate).not.toHaveBeenCalled();
    expect(database.batch).not.toHaveBeenCalled();
  });
});
