import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@lib/auth/authStore';
import { tokenStorage } from '@lib/auth/tokenStorage';
import { UserRole } from '@app-types/enums';

// DEV ONLY — shake the device and tap "Reset Auth → Login" to clear
// SecureStore and return to the login screen without reinstalling.
if (__DEV__) {
  const { DevSettings } = require('react-native');
  DevSettings.addMenuItem('Reset Auth → Login', async () => {
    const { tokenStorage: ts } = require('@lib/auth/tokenStorage');
    const { useAuthStore: store } = require('@lib/auth/authStore');
    const { router } = require('expo-router');
    await ts.clearAll();
    store.getState().clearAuth();
    router.replace('/(auth)/login');
  });
}

export default function RootLayout() {
  const { isLoading, setAuthenticated, clearAuth } = useAuthStore();

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const [token, userId, role, username] = await Promise.all([
          tokenStorage.getToken(),
          tokenStorage.getUserId(),
          tokenStorage.getUserRole(),
          tokenStorage.getUsername(),
        ]);
        if (token && userId && role) {
          setAuthenticated(userId, role as UserRole, username ?? '');
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      }
    };
    bootstrapAuth();
  }, [setAuthenticated, clearAuth]);

  if (isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#1E3A5F', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(medtech)" />
        <Stack.Screen name="index" />
      </Stack>
    </GestureHandlerRootView>
  );
}
