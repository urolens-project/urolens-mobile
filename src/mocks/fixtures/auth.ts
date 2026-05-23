import { TokenResponse } from '@app-types/domain';

export const mockTokenResponse: TokenResponse = {
  access_token: 'mock.jwt.token',
  token_type: 'bearer',
  role: 'MEDTECH',
  user_id: 'user-medtech-001',
};
