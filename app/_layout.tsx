// 💡 Level 1 Import: Global reflection polyfill must load first
import '@abraham/reflection';

import { useEffect, useState } from 'react';
import { router, Stack } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { database } from '@db/database';
import { useAuthStore } from '@lib/auth/authStore';
import { tokenStorage } from '@lib/auth/tokenStorage';
import { UserRole } from '@app-types/enums';
import { colors } from '@src/theme';

import { SESSION_TIMEOUT_MS } from '@features/auth/constants/sessionTimeout.constant';

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

/**
 * @description App root: wires up the DB provider, gesture root, and route stack, and
 * bootstraps the auth store from persisted tokens before the initial route resolves.
 */
export default function RootLayout(): React.JSX.Element {
  const { isLoading, setAuthenticated, clearAuth } = useAuthStore();
  const [hasMounted, setHasMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // 1. 💡 Force a pure, secondary effect frame to handle the mounting lifecycle safely
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // 2. Handle asynchronous authentication bootstrapping safely after mount
  useEffect(() => {
    if (!hasMounted) return; // Exit early if the component hasn't safely mounted yet

    let isCurrent = true;

    const bootstrapAuth = async (): Promise<void> => {
      try {
        const [token, userId, role, username, lastActiveAt] = await Promise.all([
          tokenStorage.getToken(),
          tokenStorage.getUserId(),
          tokenStorage.getUserRole(),
          tokenStorage.getUsername(),
          tokenStorage.getLastActiveAt(),
        ]);

        if (!isCurrent) return;

        // The medtech closed (or was backgrounded past the timeout on) the app and is
        // only now reopening it — sign them out instead of silently restoring the session.
        const wasAwayTooLong =
          lastActiveAt !== null && Date.now() - lastActiveAt >= SESSION_TIMEOUT_MS;

        if (token && userId && role && !wasAwayTooLong) {
          await tokenStorage.removeLastActiveAt();
          if (!isCurrent) return;
          setAuthenticated(userId, role as UserRole, username ?? '');
        } else {
          await tokenStorage.clearAll();
          clearAuth();
          if (wasAwayTooLong) {
            router.replace({ pathname: '/(auth)/login', params: { reason: 'inactivity' } });
          }
        }
      } catch {
        if (isCurrent) clearAuth();
      } finally {
        if (isCurrent) setIsReady(true);
      }
    };

    void bootstrapAuth();

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
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(medtech)" />
            <Stack.Screen name="index" />
          </Stack>
          {isBootstrapping && (
            <View style={styles.bootstrapOverlay}>
              <ActivityIndicator size="large" color={colors.white} />
            </View>
          )}
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bootstrapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
