import { TokenResponse } from '@app-types/domain';

export const mockTokenResponse: TokenResponse = {
  accessToken: 'mock.jwt.token',
  tokenType: 'bearer',
  role: 'MEDTECH',
  userId: 'user-medtech-001',
};
