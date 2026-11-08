import { tokenStorage } from '@lib/auth/tokenStorage';

import { getSessionTiming } from '@features/auth/lib/sessionTiming';
import {
  SESSION_TIMEOUT_MS,
  SESSION_WARNING_MS,
} from '@features/auth/constants/sessionTimeout.constant';

jest.mock('@lib/auth/tokenStorage', () => ({
  tokenStorage: { getSessionMeta: jest.fn() },
}));

const getSessionMetaMock = tokenStorage.getSessionMeta as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('getSessionTiming', () => {
  it('falls back to the built-in defaults when no session meta is stored', async () => {
    getSessionMetaMock.mockResolvedValue(null);
    expect(await getSessionTiming()).toEqual({
      timeoutMs: SESSION_TIMEOUT_MS,
      warningMs: SESSION_WARNING_MS,
    });
  });

  it("converts the role's idleTimeoutMinutes/idleWarningSeconds to milliseconds", async () => {
    getSessionMetaMock.mockResolvedValue({
      expiresAt: '2026-01-01T01:00:00Z',
      sessionExpiresAt: '2026-01-01T08:00:00Z',
      idleTimeoutMinutes: 60,
      idleWarningSeconds: 120,
    });
    expect(await getSessionTiming()).toEqual({
      timeoutMs: 60 * 60 * 1000,
      warningMs: 120 * 1000,
    });
  });
});
