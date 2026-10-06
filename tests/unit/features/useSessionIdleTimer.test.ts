import { renderHook, act } from '@testing-library/react-native';

import { useIsAuthenticated } from '@lib/auth/authStore';

import { useSessionIdleTimer } from '@features/auth/hooks/useSessionIdleTimer';
import { useAuth } from '@features/auth/hooks/useAuth';
import { getSessionTiming } from '@features/auth/lib/sessionTiming';

jest.mock('@lib/auth/authStore', () => ({ useIsAuthenticated: jest.fn() }));
jest.mock('@features/auth/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@features/auth/lib/sessionTiming', () => ({ getSessionTiming: jest.fn() }));

const mockLogout = jest.fn().mockResolvedValue(undefined);
const isAuthenticatedMock = useIsAuthenticated as jest.Mock;
const getSessionTimingMock = getSessionTiming as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  isAuthenticatedMock.mockReturnValue(true);
  (useAuth as jest.Mock).mockReturnValue({ logout: mockLogout });
  getSessionTimingMock.mockResolvedValue({ timeoutMs: 60 * 60 * 1000, warningMs: 2 * 60 * 1000 });
});

afterEach(() => jest.useRealTimers());

describe('useSessionIdleTimer', () => {
  it("shows the warning idleWarningSeconds before the role's idleTimeoutMinutes", async () => {
    const { result } = renderHook(() => useSessionIdleTimer());
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => jest.advanceTimersByTime(58 * 60 * 1000 - 1000));
    expect(result.current.isWarningVisible).toBe(false);

    await act(async () => jest.advanceTimersByTime(1000));
    expect(result.current.isWarningVisible).toBe(true);
    expect(result.current.warningMinutes).toBe(2);
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('signs the medtech out for inactivity once the full timeout elapses', async () => {
    renderHook(() => useSessionIdleTimer());
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => jest.advanceTimersByTime(60 * 60 * 1000));

    expect(mockLogout).toHaveBeenCalledWith('inactivity');
  });

  it('notifyActivity hides the warning and restarts the countdown', async () => {
    const { result } = renderHook(() => useSessionIdleTimer());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => jest.advanceTimersByTime(58 * 60 * 1000));
    expect(result.current.isWarningVisible).toBe(true);

    act(() => result.current.notifyActivity());
    expect(result.current.isWarningVisible).toBe(false);

    await act(async () => jest.advanceTimersByTime(58 * 60 * 1000 - 1000));
    expect(result.current.isWarningVisible).toBe(false);
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('does nothing while unauthenticated', async () => {
    isAuthenticatedMock.mockReturnValue(false);
    renderHook(() => useSessionIdleTimer());
    await act(async () => jest.advanceTimersByTime(60 * 60 * 1000));
    expect(mockLogout).not.toHaveBeenCalled();
    expect(getSessionTimingMock).not.toHaveBeenCalled();
  });
});
