import React from 'react';
import { render } from '@testing-library/react-native';
import { TokenRefreshHandler } from '@features/auth/components/TokenRefreshHandler';
import { authApi } from '@features/auth/api/authApi';
import { tokenStorage } from '@lib/auth/tokenStorage';

jest.mock('@features/auth/api/authApi', () => ({
  authApi: { refresh: jest.fn() },
}));
jest.mock('@lib/auth/tokenStorage', () => ({
  tokenStorage: {
    getSessionMeta: jest.fn(),
    saveToken: jest.fn().mockResolvedValue(undefined),
    saveSessionMeta: jest.fn().mockResolvedValue(undefined),
  },
}));

const refreshMock = authApi.refresh as jest.Mock;
const getSessionMetaMock = tokenStorage.getSessionMeta as jest.Mock;

const refreshedToken = {
  accessToken: 'new.jwt',
  tokenType: 'bearer',
  expiresAt: '2026-01-01T01:05:00Z',
  sessionExpiresAt: '2026-01-01T08:00:00Z',
  idleTimeoutMinutes: 60,
  idleWarningSeconds: 120,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('TokenRefreshHandler', () => {
  it('refreshes the token 60s before it expires and persists the new one', async () => {
    getSessionMetaMock.mockResolvedValue({
      expiresAt: '2026-01-01T00:05:00Z',
      sessionExpiresAt: '2026-01-01T08:00:00Z',
      idleTimeoutMinutes: 60,
      idleWarningSeconds: 120,
    });
    refreshMock.mockResolvedValue(refreshedToken);

    render(<TokenRefreshHandler />);
    await jest.advanceTimersByTimeAsync(0);
    expect(refreshMock).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(4 * 60 * 1000);

    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(tokenStorage.saveToken).toHaveBeenCalledWith('new.jwt');
    expect(tokenStorage.saveSessionMeta).toHaveBeenCalledWith({
      expiresAt: refreshedToken.expiresAt,
      sessionExpiresAt: refreshedToken.sessionExpiresAt,
      idleTimeoutMinutes: refreshedToken.idleTimeoutMinutes,
      idleWarningSeconds: refreshedToken.idleWarningSeconds,
    });
  });

  it('refreshes immediately when the stored token is already inside the buffer window', async () => {
    getSessionMetaMock.mockResolvedValue({
      expiresAt: '2026-01-01T00:00:30Z',
      sessionExpiresAt: '2026-01-01T08:00:00Z',
      idleTimeoutMinutes: 60,
      idleWarningSeconds: 120,
    });
    refreshMock.mockResolvedValue(refreshedToken);

    render(<TokenRefreshHandler />);
    await jest.advanceTimersByTimeAsync(0);

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no session is stored yet', async () => {
    getSessionMetaMock.mockResolvedValue(null);

    render(<TokenRefreshHandler />);
    await jest.advanceTimersByTimeAsync(10 * 60 * 1000);

    expect(refreshMock).not.toHaveBeenCalled();
  });
});
