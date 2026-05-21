import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E3A5F' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(medtech)" />
      <Stack.Screen name="index" />
    </Stack>
  );
}
