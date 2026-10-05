/**
 * useFailedActionCount and useFailedActions (UROLENS-220).
 *
 * Covers:
 *  - the count follows the refused-changes query and unsubscribes on unmount
 *  - the list maps each refused change with its sample, and updates when the query does
 *  - dismissAll clears them
 */

jest.mock('@db/observeQuery', () => ({ observeQuery: jest.fn() }));
jest.mock('@db/sync/failedActions', () => ({
  failedActionsQuery: jest.fn(() => 'failed-query'),
  findSampleUid: jest.fn(),
  dismissFailedActions: jest.fn(),
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { observeQuery } from '../../src/db/observeQuery';
import { dismissFailedActions, findSampleUid } from '../../src/db/sync/failedActions';
import { useFailedActions } from '../../src/features/profile/hooks/useFailedActions';
import { useFailedActionCount } from '../../src/hooks/useFailedActionCount';
import { PendingSyncAction } from '../../src/types/enums';

type Emit = (rows: unknown[]) => void;

let emit: Emit;
const unsubscribe = jest.fn();

const row = (id: string, entityId: string) => ({
  id,
  entityId,
  action: PendingSyncAction.CONFIRM_RESULT,
  errorMessage: 'RESULT_NOT_EDITABLE: This result can no longer be changed.',
});

beforeEach(() => {
  jest.clearAllMocks();
  (observeQuery as jest.Mock).mockImplementation((_query: unknown, onData: Emit) => {
    emit = onData;
    return { unsubscribe };
  });
  (findSampleUid as jest.Mock).mockImplementation(async (item: { entityId: string }) =>
    item.entityId === 'srv-res-1' ? 'SMP-20261003-00001' : null,
  );
  (dismissFailedActions as jest.Mock).mockResolvedValue(undefined);
});

describe('useFailedActionCount', () => {
  it('counts the refused changes and follows the query', () => {
    const { result } = renderHook(() => useFailedActionCount());
    expect(result.current).toBe(0);
    expect(observeQuery).toHaveBeenCalledWith('failed-query', expect.any(Function));

    act(() => emit([row('q1', 'srv-res-1'), row('q2', 'srv-res-2')]));
    expect(result.current).toBe(2);

    act(() => emit([]));
    expect(result.current).toBe(0);
  });

  it('stops listening on unmount', () => {
    const { unmount } = renderHook(() => useFailedActionCount());

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('useFailedActions', () => {
  it('lists each refused change with its sample and reason', async () => {
    const { result } = renderHook(() => useFailedActions());
    expect(result.current.items).toEqual([]);

    act(() => emit([row('q1', 'srv-res-1'), row('q2', 'srv-res-2')]));

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.items).toEqual([
      {
        id: 'q1',
        title: 'Confirm result',
        sampleUid: 'SMP-20261003-00001',
        reason: 'This result can no longer be changed.',
      },
      {
        id: 'q2',
        title: 'Confirm result',
        sampleUid: null,
        reason: 'This result can no longer be changed.',
      },
    ]);
  });

  it('empties when the changes are dismissed elsewhere', async () => {
    const { result } = renderHook(() => useFailedActions());
    act(() => emit([row('q1', 'srv-res-1')]));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => emit([]));

    await waitFor(() => expect(result.current.items).toEqual([]));
  });

  it('dismissAll clears the refused changes', async () => {
    const { result } = renderHook(() => useFailedActions());

    await act(async () => {
      await result.current.dismissAll();
    });

    expect(dismissFailedActions).toHaveBeenCalledTimes(1);
    expect(result.current.isDismissing).toBe(false);
  });

  it('stops listening on unmount', () => {
    const { unmount } = renderHook(() => useFailedActions());

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
