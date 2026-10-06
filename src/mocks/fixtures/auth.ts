import { TokenResponse } from '@app-types/domain';

export const mockTokenResponse: TokenResponse = {
  accessToken: 'mock.jwt.token',
  tokenType: 'bearer',
  role: 'MEDTECH',
  userId: 'user-medtech-001',
  expiresAt: '2026-01-01T01:00:00Z',
  sessionExpiresAt: '2026-01-01T08:00:00Z',
  idleTimeoutMinutes: 60,
  idleWarningSeconds: 120,
};
