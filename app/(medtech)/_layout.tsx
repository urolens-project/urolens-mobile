import React, { useEffect, useRef } from 'react';
import { View, AppState, AppStateStatus } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '@lib/auth/authStore';
import { UserRole } from '@app-types/enums';
import { OfflineBanner } from '@components/OfflineBanner';
import { SessionTimeoutHandler } from '@features/auth/components/SessionTimeoutHandler';
import { synchronize } from '@db/sync/syncManager';

export default function MedTechLayout() {
  const { isAuthenticated, role } = useAuthStore();
  const wasConnected = useRef<boolean | null>(null);

  // TASK-MOB-04-7: Sync on app foreground
  // TASK-MOB-04-8: Sync on network reconnect
  useEffect(() => {
    // Initial sync on mount
    synchronize();

    // Sync when app returns to foreground
    const appStateSub = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          synchronize();
        }
      },
    );

    // Sync only when connectivity is restored (not on every NetInfo event)
    const netInfoUnsub = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected ?? false;
      if (isConnected && wasConnected.current === false) {
        synchronize();
      }
      wasConnected.current = isConnected;
    });

    return () => {
      appStateSub.remove();
      netInfoUnsub();
    };
  }, []);

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
