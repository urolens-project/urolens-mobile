import React, { useEffect } from 'react';
import { View, AppState } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@lib/auth/authStore';
import { UserRole } from '@app-types/enums';
import { OfflineBanner } from '@components/OfflineBanner';
import { SessionTimeoutHandler } from '@features/auth/components/SessionTimeoutHandler';

export default function MedTechLayout() {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated || role !== UserRole.MEDTECH) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <SessionTimeoutHandler />
      <Stack>
        <Stack.Screen
          name="queue"
          options={{
            title: 'My Queue',
            headerStyle: { backgroundColor: '#1E3A5F' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="sample/[id]"
          options={{
            title: 'Sample Detail',
            headerStyle: { backgroundColor: '#1E3A5F' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="sample/override/[id]"
          options={{
            title: 'Override Parameter',
            headerStyle: { backgroundColor: '#1E3A5F' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="capture"
          options={{
            title: 'Capture Image',
            headerStyle: { backgroundColor: '#1E3A5F' },
            headerTintColor: '#FFFFFF',
          }}
        />
      </Stack>
    </View>
  );
}
