import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'urolens_access_token';
const USER_ID_KEY = 'urolens_user_id';
const USER_ROLE_KEY = 'urolens_user_role';
const USERNAME_KEY = 'urolens_username';

// expo-secure-store wraps the iOS Keychain / Android Keystore and is unavailable on web,
// so web falls back to AsyncStorage (localStorage under the hood).
async function getItem(key: string): Promise<string | null> {
  return Platform.OS === 'web'
    ? AsyncStorage.getItem(key)
    : SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  return Platform.OS === 'web'
    ? AsyncStorage.setItem(key, value)
    : SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  return Platform.OS === 'web'
    ? AsyncStorage.removeItem(key)
    : SecureStore.deleteItemAsync(key);
}

export const tokenStorage = {
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

  async clearAll(): Promise<void> {
    await deleteItem(ACCESS_TOKEN_KEY);
    await deleteItem(USER_ID_KEY);
    await deleteItem(USER_ROLE_KEY);
    await deleteItem(USERNAME_KEY);
  },
};
