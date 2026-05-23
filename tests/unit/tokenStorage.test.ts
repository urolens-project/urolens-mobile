import { tokenStorage } from '../../src/lib/auth/tokenStorage';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store is auto-mocked by tests/setup.ts
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('tokenStorage', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('saveToken / getToken', () => {
    it('saves token to SecureStore with the correct key', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      await tokenStorage.saveToken('test-jwt-token');
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'urolens_access_token',
        'test-jwt-token',
      );
    });

    it('retrieves token from SecureStore', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('test-jwt-token');
      const token = await tokenStorage.getToken();
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('urolens_access_token');
      expect(token).toBe('test-jwt-token');
    });

    it('returns null when no token is stored', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      const token = await tokenStorage.getToken();
      expect(token).toBeNull();
    });
  });

  describe('removeToken', () => {
    it('deletes the access token key', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
      await tokenStorage.removeToken();
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('urolens_access_token');
    });
  });

  describe('saveUserInfo / getUserId / getUserRole', () => {
    it('saves userId and role to SecureStore', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      await tokenStorage.saveUserInfo('user-001', 'MEDTECH');
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('urolens_user_id', 'user-001');
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('urolens_user_role', 'MEDTECH');
    });

    it('retrieves userId', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('user-001');
      const userId = await tokenStorage.getUserId();
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('urolens_user_id');
      expect(userId).toBe('user-001');
    });

    it('retrieves userRole', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('MEDTECH');
      const role = await tokenStorage.getUserRole();
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('urolens_user_role');
      expect(role).toBe('MEDTECH');
    });

    it('returns null when userId not stored', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      const userId = await tokenStorage.getUserId();
      expect(userId).toBeNull();
    });
  });

  describe('clearAll', () => {
    it('deletes all three SecureStore keys', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
      await tokenStorage.clearAll();
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('urolens_access_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('urolens_user_id');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('urolens_user_role');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
    });
  });
});
