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
    it('deletes all six SecureStore keys', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
      await tokenStorage.clearAll();
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('urolens_access_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('urolens_user_id');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('urolens_user_role');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('urolens_username');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('urolens_last_active_at');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('urolens_session_meta');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(6);
    });
  });

  describe('saveSessionMeta / getSessionMeta', () => {
    const meta = {
      expiresAt: '2026-01-01T01:00:00Z',
      sessionExpiresAt: '2026-01-01T08:00:00Z',
      idleTimeoutMinutes: 60,
      idleWarningSeconds: 120,
    };

    it('saves session meta as JSON to SecureStore', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      await tokenStorage.saveSessionMeta(meta);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'urolens_session_meta',
        JSON.stringify(meta),
      );
    });

    it('retrieves and parses saved session meta', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(meta));
      expect(await tokenStorage.getSessionMeta()).toEqual(meta);
    });

    it('returns null when no session meta is stored', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      expect(await tokenStorage.getSessionMeta()).toBeNull();
    });
  });

  describe('session-only mode (keep me logged in off)', () => {
    afterEach(() => tokenStorage.setSessionOnly(false));

    it('keeps values in memory and never writes them to SecureStore', async () => {
      tokenStorage.setSessionOnly(true);
      await tokenStorage.saveToken('volatile-token');
      expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
      expect(await tokenStorage.getToken()).toBe('volatile-token');
      expect(mockSecureStore.getItemAsync).not.toHaveBeenCalled();
    });

    it('forgets in-memory values after clearAll', async () => {
      tokenStorage.setSessionOnly(true);
      await tokenStorage.saveToken('volatile-token');
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      await tokenStorage.clearAll();
      expect(await tokenStorage.getToken()).toBeNull();
    });
  });
});
