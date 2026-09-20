import { useState } from 'react';
import { router } from 'expo-router';
import { authApi } from '../api/authApi';
import { tokenStorage } from '@lib/auth/tokenStorage';
import { useAuthStore } from '@lib/auth/authStore';
import { UserRole } from '@app-types/enums';
import { ApiError } from '@app-types/domain';

export function useAuth() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuthenticated, clearAuth } = useAuthStore();

  const login = async (username: string, password: string, keepLoggedIn = false) => {
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const data = await authApi.login(username, password);
      // Drop any session left over from a previous login, then choose where this one lives.
      await tokenStorage.clearAll();
      tokenStorage.setSessionOnly(!keepLoggedIn);
      await tokenStorage.saveToken(data.accessToken);
      await tokenStorage.saveUserInfo(data.userId, data.role, username);
      setAuthenticated(data.userId, data.role as UserRole, username);
      router.replace('/(medtech)/queue');
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.code === 'ACCOUNT_LOCKED') {
        setError('Your account is locked. Contact an administrator.');
      } else if (apiError.code === 'ACCOUNT_INACTIVE') {
        setError('Your account is inactive. Contact an administrator.');
      } else if (apiError.code === 'NETWORK_ERROR') {
        setError('Cannot reach the server. Check your connection and try again.');
      } else if (apiError.code === 'TIMEOUT') {
        setError('The server took too long to respond. Please try again.');
      } else if (apiError.code === 'INVALID_CREDENTIALS') {
        setError('Invalid username or password.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Continue logout even if server call fails
    } finally {
      await tokenStorage.clearAll();
      clearAuth();
      router.replace('/(auth)/login');
    }
  };

  return { login, logout, isSubmitting, error };
}
