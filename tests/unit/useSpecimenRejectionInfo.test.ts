import { act, renderHook } from '@testing-library/react-native';

import { database } from '@db/database';
import { useUserId } from '@lib/auth/authStore';
import { useSpecimenRejectionInfo } from '@features/specimen-rejection/hooks/useSpecimenRejectionInfo';

jest.mock('@nozbe/watermelondb', () => ({ Model: class {}, Q: { where: jest.fn() } }));
jest.mock('@db/database', () => ({ database: { get: jest.fn() } }));
jest.mock('@lib/auth/authStore', () => ({ useUserId: jest.fn() }));

interface Observer {
  next: (rows: Record<string, unknown>[]) => void;
  error: (error: unknown) => void;
}

const specimen = {
  serverId: 'server-1',
  status: 'ASSIGNED',
  medtechId: 'medtech-1',
  sampleUid: 'SMP-1',
  patientUid: 'PT-1',
};

function setupObservers() {
  let specimenObserver: Observer;
  let resultObserver: Observer;
  const specimenUnsubscribe = jest.fn();
  const resultUnsubscribe = jest.fn();
  (database.get as jest.Mock).mockImplementation((table: string) => ({
    query: () => ({
      observeWithColumns: () => ({
        subscribe: (observer: Observer) => {
          if (table === 'specimens') {
            specimenObserver = observer;
            return { unsubscribe: specimenUnsubscribe };
          }
          resultObserver = observer;
          return { unsubscribe: resultUnsubscribe };
        },
      }),
    }),
  }));
  return {
    emitSpecimens: (rows: Record<string, unknown>[]): void => specimenObserver.next(rows),
    emitResults: (rows: Record<string, unknown>[]): void => resultObserver.next(rows),
    failResults: (error: unknown): void => resultObserver.error(error),
    specimenUnsubscribe,
    resultUnsubscribe,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useUserId as jest.Mock).mockReturnValue('medtech-1');
});

it('waits for the latest result before exposing the rejection form', () => {
  const observers = setupObservers();
  const { result } = renderHook(() => useSpecimenRejectionInfo('local-1'));
  act(() => observers.emitSpecimens([specimen]));
  expect(result.current.isLoadingSpecimen).toBe(true);
  act(() => observers.emitResults([{ specimenId: 'server-1', status: 'APPROVED', createdAt: 1 }]));
  expect(result.current.isLoadingSpecimen).toBe(false);
  expect(result.current.blockedReason).toMatch(/submitted for supervisor review/);
});

it('updates eligibility when the supervisor returns the result', () => {
  const observers = setupObservers();
  const { result } = renderHook(() => useSpecimenRejectionInfo('local-1'));
  act(() => observers.emitSpecimens([specimen]));
  act(() =>
    observers.emitResults([
      { specimenId: 'server-1', status: 'PENDING_SUPERVISOR_APPROVAL', createdAt: 1 },
    ]),
  );
  expect(result.current.blockedReason).not.toBeNull();
  act(() =>
    observers.emitResults([
      { specimenId: 'server-1', status: 'RETURNED_FOR_CORRECTION', createdAt: 1 },
    ]),
  );
  expect(result.current.blockedReason).toBeNull();
});

it('clears specimen information if the record disappears', () => {
  const observers = setupObservers();
  const { result } = renderHook(() => useSpecimenRejectionInfo('local-1'));
  act(() => observers.emitSpecimens([specimen]));
  act(() => observers.emitResults([]));
  expect(result.current.specimenInfo?.sampleUid).toBe('SMP-1');
  act(() => observers.emitSpecimens([]));
  expect(result.current.specimenInfo).toBeNull();
  expect(result.current.blockedReason).toMatch(/could not be found/);
  expect(observers.resultUnsubscribe).toHaveBeenCalled();
});

it('blocks rejection when the assignment changes', () => {
  const observers = setupObservers();
  const { result } = renderHook(() => useSpecimenRejectionInfo('local-1'));
  act(() => observers.emitSpecimens([specimen]));
  act(() => observers.emitResults([]));
  act(() => observers.emitSpecimens([{ ...specimen, medtechId: 'someone-else' }]));
  expect(result.current.blockedReason).toMatch(/assigned to you/);
});

it('finishes loading with an explanation when the route has no identifier', () => {
  setupObservers();
  const { result } = renderHook(() => useSpecimenRejectionInfo(''));
  expect(result.current.isLoadingSpecimen).toBe(false);
  expect(result.current.blockedReason).toMatch(/could not be found/);
  expect(database.get).not.toHaveBeenCalled();
});

it('reports subscription failures and releases subscriptions on unmount', () => {
  const observers = setupObservers();
  const { result, unmount } = renderHook(() => useSpecimenRejectionInfo('local-1'));
  act(() => observers.emitSpecimens([specimen]));
  act(() => observers.failResults(new Error('Could not read local results.')));
  expect(result.current.isLoadingSpecimen).toBe(false);
  expect(result.current.blockedReason).toBe('Could not read local results.');
  unmount();
  expect(observers.specimenUnsubscribe).toHaveBeenCalled();
  expect(observers.resultUnsubscribe).toHaveBeenCalled();
});
