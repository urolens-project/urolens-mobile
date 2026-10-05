import { AppState, type AppStateStatus } from 'react-native';

import { act, renderHook } from '@testing-library/react-native';

import { tokenStorage } from '@lib/auth/tokenStorage';

import { SessionTimeoutHandler } from '@features/auth/components/SessionTimeoutHandler';
import { SESSION_TIMEOUT_MS } from '@features/auth/constants/sessionTimeout.constant';
import { useAuth } from '@features/auth/hooks/useAuth';

jest.mock('@lib/auth/tokenStorage', (): object => ({
  tokenStorage: { saveLastActiveAt: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('@features/auth/hooks/useAuth', (): object => ({ useAuth: jest.fn() }));

const START_TIME = 1_000_000;
const mockLogout = jest.fn().mockResolvedValue(undefined);
const mockRemove = jest.fn();
let handleAppStateChange: (state: AppStateStatus) => Promise<void>;

async function changeAppState(state: AppStateStatus): Promise<void> {
  await act(async (): Promise<void> => {
    await handleAppStateChange(state);
  });
}

beforeEach((): void => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(START_TIME);
  jest.mocked(useAuth).mockReturnValue({
    login: jest.fn(),
    logout: mockLogout,
    isSubmitting: false,
    error: null,
  });
  jest
    .mocked(AppState.addEventListener)
    .mockImplementation((_event, listener): ReturnType<typeof AppState.addEventListener> => {
      handleAppStateChange = listener as typeof handleAppStateChange;
      return { remove: mockRemove };
    });
});

afterEach((): void => {
  jest.useRealTimers();
});

describe('SessionTimeoutHandler', (): void => {
  it('ignores inactive-only iOS interruptions even beyond the background timeout', async (): Promise<void> => {
    renderHook(SessionTimeoutHandler);

    await changeAppState('inactive');
    jest.setSystemTime(START_TIME + SESSION_TIMEOUT_MS);
    await changeAppState('active');

    expect(tokenStorage.saveLastActiveAt).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('persists the time of backgrounding after an inactive transition', async (): Promise<void> => {
    renderHook(SessionTimeoutHandler);

    await changeAppState('inactive');
    jest.setSystemTime(START_TIME + SESSION_TIMEOUT_MS);
    await changeAppState('background');

    expect(tokenStorage.saveLastActiveAt).toHaveBeenCalledTimes(1);
    expect(tokenStorage.saveLastActiveAt).toHaveBeenCalledWith(START_TIME + SESSION_TIMEOUT_MS);
  });

  it('keeps the session when returning before the background timeout', async (): Promise<void> => {
    renderHook(SessionTimeoutHandler);

    await changeAppState('background');
    jest.setSystemTime(START_TIME + SESSION_TIMEOUT_MS - 1);
    await changeAppState('inactive');
    await changeAppState('active');

    expect(tokenStorage.saveLastActiveAt).toHaveBeenCalledTimes(1);
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('expires the session at the background timeout despite an inactive transition on resume', async (): Promise<void> => {
    renderHook(SessionTimeoutHandler);

    await changeAppState('background');
    jest.setSystemTime(START_TIME + SESSION_TIMEOUT_MS);
    await changeAppState('inactive');
    await changeAppState('active');
    await changeAppState('active');

    expect(tokenStorage.saveLastActiveAt).toHaveBeenCalledTimes(1);
    expect(tokenStorage.saveLastActiveAt).toHaveBeenCalledWith(START_TIME);
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledWith('inactivity');
  });

  it('clears the background time after a short return to the foreground', async (): Promise<void> => {
    renderHook(SessionTimeoutHandler);

    await changeAppState('background');
    await changeAppState('active');
    await changeAppState('inactive');
    jest.setSystemTime(START_TIME + SESSION_TIMEOUT_MS);
    await changeAppState('active');

    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('removes the app state listener on unmount', async (): Promise<void> => {
    const { unmount } = renderHook(SessionTimeoutHandler);

    await act(async (): Promise<void> => {
      unmount();
    });

    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
