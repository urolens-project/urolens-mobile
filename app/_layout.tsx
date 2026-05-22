import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@lib/auth/authStore';
import { tokenStorage } from '@lib/auth/tokenStorage';
import { UserRole } from '@app-types/enums';

export default function RootLayout() {
  const { isLoading, setAuthenticated, clearAuth } = useAuthStore();

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const [token, userId, role] = await Promise.all([
          tokenStorage.getToken(),
          tokenStorage.getUserId(),
          tokenStorage.getUserRole(),
        ]);
        if (token && userId && role) {
          setAuthenticated(userId, role as UserRole);
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
