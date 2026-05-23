import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'urolens_access_token';
const USER_ID_KEY = 'urolens_user_id';
const USER_ROLE_KEY = 'urolens_user_role';
const USERNAME_KEY = 'urolens_username';

export const tokenStorage = {
  async saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  },

  async saveUserInfo(userId: string, role: string, username: string): Promise<void> {
    await SecureStore.setItemAsync(USER_ID_KEY, userId);
    await SecureStore.setItemAsync(USER_ROLE_KEY, role);
    await SecureStore.setItemAsync(USERNAME_KEY, username);
  },

  async getUserId(): Promise<string | null> {
    return SecureStore.getItemAsync(USER_ID_KEY);
  },

  async getUserRole(): Promise<string | null> {
    return SecureStore.getItemAsync(USER_ROLE_KEY);
  },

  async getUsername(): Promise<string | null> {
    return SecureStore.getItemAsync(USERNAME_KEY);
  },

  async clearAll(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_ID_KEY);
    await SecureStore.deleteItemAsync(USER_ROLE_KEY);
    await SecureStore.deleteItemAsync(USERNAME_KEY);
  },
};
