// Path: urolens-mobile/tests/unit/features/useFieldActions.test.ts
/**
 * useFieldActions — offline accept/discard (applyOptimistic).
 *
 * Covers the fix in mobile PR #55 review, 1.4: analysis_results.fieldCount is never
 * synced by the backend and nothing reads it (the Queue counts live off result_fields
 * rows — see useQueue.ts), so applyOptimistic must no longer read or write it. The
 * accepted count it returns (read by FieldCaptureSessionScreen to update the live "x
 * of 10" counter) must come from a live count of the field's ACCEPTED siblings instead.
 */
import { renderHook, act } from '@testing-library/react-native';

import { useFieldActions } from '@features/field-capture/hooks/useFieldActions';
import { database } from '@db/database';
import { PendingSyncAction } from '@app-types/enums';

jest.mock('@nozbe/watermelondb', () => ({
  Q: {
    where: jest.fn((field: string, value: unknown) => ({ field, value })),
    notEq: jest.fn((value: unknown) => ({ notEq: value })),
  },
}));

jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));

jest.mock('../../../src/features/field-capture/api/fieldCaptureApi', () => ({
  fieldCaptureApi: { accept: jest.fn(), discard: jest.fn() },
}));

jest.mock('@db/database', () => ({
  database: {
    get: jest.fn(),
    write: jest.fn((fn: () => Promise<void>) => fn()),
    batch: jest.fn().mockResolvedValue(undefined),
  },
}));

import { useNetworkStatus } from '@hooks/useNetworkStatus';

interface MockField {
  id: string;
  serverId: string | null;
  resultId: string;
  imageId: string | null;
  status: string;
  isReviewed: boolean;
  prepareUpdate: jest.Mock;
  update: jest.Mock;
}

function mockField(overrides: Partial<MockField> = {}): MockField {
  const field: MockField = {
    id: 'local-field-1',
    serverId: 'server-field-1',
    resultId: 'server-result-1',
    imageId: 'img-1',
    status: 'ANALYZED',
    isReviewed: false,
    prepareUpdate: jest.fn(),
    update: jest.fn(),
    ...overrides,
  };
  field.prepareUpdate.mockImplementation((cb: (f: MockField) => void) => {
    cb(field);
    return { prepared: 'field-update' };
  });
  field.update.mockImplementation(async (cb: (f: MockField) => void) => {
    cb(field);
  });
  return field;
}

function setUp(options: {
  field: MockField;
  otherAcceptedCount: number;
  parent?: { imageId: string | null };
}): { parent: { imageId: string | null; prepareUpdate: jest.Mock } } {
  const parent = {
    imageId: options.parent?.imageId ?? null,
    prepareUpdate: jest.fn(),
  };
  parent.prepareUpdate.mockImplementation((cb: (r: typeof parent) => void) => {
    cb(parent);
    return { prepared: 'parent-update' };
  });

  (database.get as jest.Mock).mockImplementation((table: string) => {
    if (table === 'result_fields') {
      return {
        find: jest.fn().mockResolvedValue(options.field),
        query: jest.fn(() => ({
          fetchCount: jest.fn().mockResolvedValue(options.otherAcceptedCount),
        })),
      };
    }
    if (table === 'analysis_results') {
      return { query: jest.fn(() => ({ fetch: jest.fn().mockResolvedValue([parent]) })) };
    }
    if (table === 'pending_sync') {
      return {
        prepareCreate: jest.fn((cb: (row: Record<string, unknown>) => void) => {
          const row: Record<string, unknown> = {};
          cb(row);
          return { prepared: 'pending-sync', row };
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return { parent };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
});

describe('useFieldActions — offline accept', () => {
  it('marks the field reviewed, since Proceed already implies it was looked at', async () => {
    const field = mockField({ isReviewed: false });
    setUp({ field, otherAcceptedCount: 4 });
    const { result } = renderHook(() => useFieldActions());

    await act(async () => {
      await result.current.acceptField('local-field-1');
    });

    expect(field.isReviewed).toBe(true);
  });

  it('counts the accepted total live off result_fields, not the stale fieldCount column', async () => {
    setUp({ field: mockField(), otherAcceptedCount: 4 });
    const { result } = renderHook(() => useFieldActions());

    let outcome;
    await act(async () => {
      outcome = await result.current.acceptField('local-field-1');
    });

    expect(outcome).toEqual({
      acceptedFieldCount: 5,
      verifiedFieldCount: 0,
      undecidedFieldCount: 0,
    });
  });

  it('never writes analysis_results.fieldCount', async () => {
    const { parent } = setUp({ field: mockField(), otherAcceptedCount: 4 });
    const { result } = renderHook(() => useFieldActions());

    await act(async () => {
      await result.current.acceptField('local-field-1');
    });

    expect(parent.prepareUpdate).toHaveBeenCalledTimes(1);
    expect(parent).not.toHaveProperty('fieldCount');
  });

  it('still sets the parent image pointer on first accept', async () => {
    const { parent } = setUp({ field: mockField({ imageId: 'img-7' }), otherAcceptedCount: 0 });
    const { result } = renderHook(() => useFieldActions());

    await act(async () => {
      await result.current.acceptField('local-field-1');
    });

    expect(parent.imageId).toBe('img-7');
  });

  it('leaves an already-set image pointer alone', async () => {
    const { parent } = setUp({
      field: mockField({ imageId: 'img-new' }),
      otherAcceptedCount: 0,
      parent: { imageId: 'img-existing' },
    });
    const { result } = renderHook(() => useFieldActions());

    await act(async () => {
      await result.current.acceptField('local-field-1');
    });

    expect(parent.prepareUpdate).not.toHaveBeenCalled();
    expect(parent.imageId).toBe('img-existing');
  });

  it('queues an ACCEPT_FIELD pending-sync action against the field server id', async () => {
    setUp({ field: mockField({ serverId: 'server-field-9' }), otherAcceptedCount: 0 });
    const { result } = renderHook(() => useFieldActions());

    await act(async () => {
      await result.current.acceptField('local-field-1');
    });

    expect(database.batch).toHaveBeenCalled();
    const batched = (database.batch as jest.Mock).mock.calls[0];
    const pendingSyncEntry = batched.find(
      (item: { row?: Record<string, unknown> }) => item?.row,
    ) as { row: Record<string, unknown> };
    expect(pendingSyncEntry.row).toMatchObject({
      entity: 'result_field',
      entityId: 'server-field-9',
      action: PendingSyncAction.ACCEPT_FIELD,
    });
  });
});

describe('useFieldActions — offline discard', () => {
  it('does not mark the field reviewed', async () => {
    const field = mockField({ status: 'ACCEPTED', isReviewed: false });
    setUp({ field, otherAcceptedCount: 3 });
    const { result } = renderHook(() => useFieldActions());

    await act(async () => {
      await result.current.discardField('local-field-1');
    });

    expect(field.isReviewed).toBe(false);
  });

  it('excludes the field itself from the live count, so discarding an accepted field does not drop the total twice', async () => {
    setUp({ field: mockField({ status: 'ACCEPTED' }), otherAcceptedCount: 3 });
    const { result } = renderHook(() => useFieldActions());

    let outcome;
    await act(async () => {
      outcome = await result.current.discardField('local-field-1');
    });

    expect(outcome).toEqual({
      acceptedFieldCount: 3,
      verifiedFieldCount: 0,
      undecidedFieldCount: 0,
    });
  });

  it('does not touch the parent image pointer on discard', async () => {
    const { parent } = setUp({ field: mockField({ status: 'ACCEPTED' }), otherAcceptedCount: 3 });
    const { result } = renderHook(() => useFieldActions());

    await act(async () => {
      await result.current.discardField('local-field-1');
    });

    expect(parent.prepareUpdate).not.toHaveBeenCalled();
  });
});

describe('useFieldActions — markFieldReviewed', () => {
  it('sets isReviewed locally without queuing a pending-sync row', async () => {
    const field = mockField({ isReviewed: false });
    setUp({ field, otherAcceptedCount: 0 });
    const { result } = renderHook(() => useFieldActions());

    await act(async () => {
      await result.current.markFieldReviewed('local-field-1');
    });

    expect(field.isReviewed).toBe(true);
    expect(database.batch).not.toHaveBeenCalled();
  });

  it('is a no-op for a field already marked reviewed', async () => {
    const field = mockField({ isReviewed: true });
    setUp({ field, otherAcceptedCount: 0 });
    const { result } = renderHook(() => useFieldActions());

    await act(async () => {
      await result.current.markFieldReviewed('local-field-1');
    });

    expect(field.update).not.toHaveBeenCalled();
  });
});
