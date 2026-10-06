import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@lib/auth/authStore';
import { tokenStorage } from '@lib/auth/tokenStorage';
import { UserRole } from '@app-types/enums';

import { authApi } from '@features/auth/api/authApi';
import { SESSION_TIMEOUT_MS } from '@features/auth/constants/sessionTimeout.constant';
import { useAuth } from '@features/auth/hooks/useAuth';

jest.mock('@abraham/reflection', (): object => ({}));
jest.mock('@db/database', (): object => ({ database: {} }));
jest.mock('@nozbe/watermelondb/DatabaseProvider', (): object => ({
  DatabaseProvider: 'DatabaseProvider',
}));
jest.mock('react-native-gesture-handler', (): object => ({
  GestureHandlerRootView: 'GestureHandlerRootView',
}));
jest.mock('react-native-safe-area-context', (): object => ({
  SafeAreaProvider: 'SafeAreaProvider',
}));
jest.mock('expo-router', (): object => ({
  router: { replace: jest.fn() },
  Stack: Object.assign((): null => null, { Screen: (): null => null }),
}));
jest.mock('@features/auth/api/authApi', (): object => ({
  authApi: { login: jest.fn(), logout: jest.fn().mockResolvedValue(undefined) },
}));

const CURRENT_TIME = SESSION_TIMEOUT_MS * 3;
const mockPersistedValues = new Map<string, string>();
let RootLayout: () => React.JSX.Element;

beforeAll((): void => {
  // The native development menu is unrelated to restoring a persisted session.
  jest.replaceProperty(global, '__DEV__', false);
  RootLayout = jest.requireActual<{ default: () => React.JSX.Element }>(
    '../../app/_layout',
  ).default;
});

beforeEach(async (): Promise<void> => {
  jest.clearAllMocks();
  mockPersistedValues.clear();
  tokenStorage.setSessionOnly(false);
  useAuthStore.getState().clearAuth();
  jest.spyOn(Date, 'now').mockReturnValue(CURRENT_TIME);
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key): Promise<string | null> => {
    return mockPersistedValues.get(key) ?? null;
  });
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value): Promise<void> => {
    mockPersistedValues.set(key, value);
  });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key): Promise<void> => {
    mockPersistedValues.delete(key);
  });
  await tokenStorage.saveToken('existing-token');
  await tokenStorage.saveUserInfo('user-1', UserRole.MEDTECH, 'medtech01');
});

afterEach(async (): Promise<void> => {
  await tokenStorage.clearAll();
  tokenStorage.setSessionOnly(false);
  jest.restoreAllMocks();
});

describe('session restoration', (): void => {
  it('restores a session without a background timestamp', async (): Promise<void> => {
    renderHook(RootLayout);

    await waitFor((): void => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
    expect(await tokenStorage.getToken()).toBe('existing-token');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('clears a valid background timestamp so a later cold start keeps the session', async (): Promise<void> => {
    await tokenStorage.saveLastActiveAt(CURRENT_TIME - SESSION_TIMEOUT_MS + 1);
    const { unmount } = renderHook(RootLayout);

    await waitFor((): void => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
    expect(await tokenStorage.getLastActiveAt()).toBeNull();
    await act(async (): Promise<void> => {
      unmount();
      useAuthStore.getState().clearAuth();
    });
    jest.spyOn(Date, 'now').mockReturnValue(CURRENT_TIME + SESSION_TIMEOUT_MS);

    renderHook(RootLayout);

    await waitFor((): void => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
    expect(await tokenStorage.getToken()).toBe('existing-token');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('still expires a session genuinely backgrounded for the timeout', async (): Promise<void> => {
    await tokenStorage.saveLastActiveAt(CURRENT_TIME - SESSION_TIMEOUT_MS);

    renderHook(RootLayout);

    await waitFor((): void => {
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/(auth)/login',
        params: { reason: 'inactivity' },
      });
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(await tokenStorage.getToken()).toBeNull();
    expect(await tokenStorage.getLastActiveAt()).toBeNull();
  });

  it.each([true, false])(
    'clears an old timestamp on fresh login with keepLoggedIn=%s',
    async (keepLoggedIn: boolean): Promise<void> => {
      await tokenStorage.saveLastActiveAt(CURRENT_TIME - SESSION_TIMEOUT_MS);
      jest.mocked(authApi.login).mockResolvedValue({
        accessToken: 'new-token',
        tokenType: 'bearer',
        userId: 'user-2',
        role: UserRole.MEDTECH,
      });
      const { result, unmount } = renderHook(useAuth);

      await act(async (): Promise<void> => {
        await result.current.login('medtech02', 'password', keepLoggedIn);
      });

      expect(await tokenStorage.getLastActiveAt()).toBeNull();
      expect(await tokenStorage.getToken()).toBe('new-token');
      expect(useAuthStore.getState().userId).toBe('user-2');
      expect(result.current.error).toBeNull();
      jest.mocked(router.replace).mockClear();
      await act(async (): Promise<void> => {
        unmount();
        useAuthStore.getState().clearAuth();
      });

      renderHook(RootLayout);

      await waitFor((): void => {
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(await tokenStorage.getToken()).toBe('new-token');
      expect(router.replace).not.toHaveBeenCalled();
    },
  );
});
