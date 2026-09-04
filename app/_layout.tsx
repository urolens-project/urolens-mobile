// 💡 Level 1 Import: Global reflection polyfill must load first
import '@abraham/reflection';

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { database } from '@db/database';
import { useAuthStore } from '@lib/auth/authStore';
import { tokenStorage } from '@lib/auth/tokenStorage';
import { UserRole } from '@app-types/enums';

import AsyncStorage from '@react-native-async-storage/async-storage';

// DEV ONLY — shake the device and tap "Reset Auth → Login" to clear
if (__DEV__ && Platform.OS !== 'web') {
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
  const [hasMounted, setHasMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // 1. 💡 Force a pure, secondary effect frame to handle the mounting lifecycle safely
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // TEMP — clear sync timestamp so next launch triggers a full sync + local DB reset
  useEffect(() => {
    AsyncStorage.removeItem('urolens_last_sync_at');
  }, []);

  // 2. Handle asynchronous authentication bootstrapping safely after mount
  useEffect(() => {
    if (!hasMounted) return; // Exit early if the component hasn't safely mounted yet

    let isCurrent = true;

    const bootstrapAuth = async () => {
      try {
        const [token, userId, role, username] = await Promise.all([
          tokenStorage.getToken(),
          tokenStorage.getUserId(),
          tokenStorage.getUserRole(),
          tokenStorage.getUsername(),
        ]);
        
        if (!isCurrent) return;

        if (token && userId && role) {
          setAuthenticated(userId, role as UserRole, username ?? '');
        } else {
          clearAuth();
        }
      } catch {
        if (isCurrent) clearAuth();
      } finally {
        if (isCurrent) setIsReady(true);
      }
    };

    bootstrapAuth();

    return () => {
      isCurrent = false;
    };
  }, [hasMounted, setAuthenticated, clearAuth]);

  const isBootstrapping = !hasMounted || isLoading || !isReady;

  // Keep the navigator mounted at all times — expo-router resolves the initial
  // deep link as soon as it mounts, and swapping it out for a fallback tree
  // races that resolution against an unmount, producing "state update on a
  // component that hasn't mounted yet". Overlay the loading state instead.
  return (
    <DatabaseProvider database={database}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(medtech)" />
          <Stack.Screen name="index" />
        </Stack>
        {isBootstrapping && (
          <View style={styles.bootstrapOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}
      </GestureHandlerRootView>
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  bootstrapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
  },
});