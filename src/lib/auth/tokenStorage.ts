import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'urolens_access_token';
const USER_ID_KEY = 'urolens_user_id';
const USER_ROLE_KEY = 'urolens_user_role';
const USERNAME_KEY = 'urolens_username';
const LAST_ACTIVE_AT_KEY = 'urolens_last_active_at';

// expo-secure-store wraps the iOS Keychain / Android Keystore and is unavailable on web,
// so web falls back to AsyncStorage (localStorage under the hood).
//
// When "Keep me logged in" is off, the session lives in `sessionMemory` only: it is
// never written to disk, so it disappears when the app process is killed.
const sessionMemory = new Map<string, string>();
let sessionOnly = false;

async function getItem(key: string): Promise<string | null> {
  const inMemory = sessionMemory.get(key);
  if (inMemory !== undefined) return inMemory;
  return Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (sessionOnly) {
    sessionMemory.set(key, value);
    return;
  }
  return Platform.OS === 'web'
    ? AsyncStorage.setItem(key, value)
    : SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  sessionMemory.delete(key);
  return Platform.OS === 'web' ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key);
}

export const tokenStorage = {
  /** When true, subsequent saves are kept in memory only and never persisted to disk. */
  setSessionOnly(value: boolean): void {
    sessionOnly = value;
  },

  async saveToken(token: string): Promise<void> {
    await setItem(ACCESS_TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return getItem(ACCESS_TOKEN_KEY);
  },

  async removeToken(): Promise<void> {
    await deleteItem(ACCESS_TOKEN_KEY);
  },

  async saveUserInfo(userId: string, role: string, username: string): Promise<void> {
    await setItem(USER_ID_KEY, userId);
    await setItem(USER_ROLE_KEY, role);
    await setItem(USERNAME_KEY, username);
  },

  async getUserId(): Promise<string | null> {
    return getItem(USER_ID_KEY);
  },

  async getUserRole(): Promise<string | null> {
    return getItem(USER_ROLE_KEY);
  },

  async getUsername(): Promise<string | null> {
    return getItem(USERNAME_KEY);
  },

  /** Records "now" as the last moment the medtech was active, so a cold start can tell
   * how long the app was backgrounded or closed. */
  async saveLastActiveAt(timestamp: number): Promise<void> {
    await setItem(LAST_ACTIVE_AT_KEY, String(timestamp));
  },

  async getLastActiveAt(): Promise<number | null> {
    const value = await getItem(LAST_ACTIVE_AT_KEY);
    return value ? Number(value) : null;
  },

  async clearAll(): Promise<void> {
    await deleteItem(ACCESS_TOKEN_KEY);
    await deleteItem(USER_ID_KEY);
    await deleteItem(USER_ROLE_KEY);
    await deleteItem(USERNAME_KEY);
    await deleteItem(LAST_ACTIVE_AT_KEY);
  },
};
