import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { tokenStorage } from '@lib/auth/tokenStorage';

const BACKGROUND_TIME = 1_000_000;

beforeEach((): void => {
  jest.clearAllMocks();
  tokenStorage.setSessionOnly(false);
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
});

afterEach(async (): Promise<void> => {
  await tokenStorage.clearAll();
  tokenStorage.setSessionOnly(false);
  jest.restoreAllMocks();
});

describe('tokenStorage.removeLastActiveAt', (): void => {
  it('deletes the native background timestamp without deleting credentials', async (): Promise<void> => {
    await tokenStorage.saveLastActiveAt(BACKGROUND_TIME);
    await tokenStorage.removeLastActiveAt();

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'urolens_last_active_at',
      String(BACKGROUND_TIME),
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('urolens_last_active_at');
    expect(await tokenStorage.getLastActiveAt()).toBeNull();
  });

  it('deletes the web background timestamp from AsyncStorage', async (): Promise<void> => {
    jest.replaceProperty(Platform, 'OS', 'web');

    await tokenStorage.saveLastActiveAt(BACKGROUND_TIME);
    await tokenStorage.removeLastActiveAt();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'urolens_last_active_at',
      String(BACKGROUND_TIME),
    );
    expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('urolens_last_active_at');
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(await tokenStorage.getLastActiveAt()).toBeNull();
  });

  it('clears the memory-only timestamp while keeping the session token', async (): Promise<void> => {
    tokenStorage.setSessionOnly(true);
    await tokenStorage.saveToken('session-token');
    await tokenStorage.saveLastActiveAt(BACKGROUND_TIME);
    expect(await tokenStorage.getLastActiveAt()).toBe(BACKGROUND_TIME);

    await tokenStorage.removeLastActiveAt();

    expect(await tokenStorage.getLastActiveAt()).toBeNull();
    expect(await tokenStorage.getToken()).toBe('session-token');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('urolens_last_active_at');
  });
});
