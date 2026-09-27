import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, View, Text, StyleSheet } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '@lib/auth/authStore';
import { UserRole } from '@app-types/enums';
import { synchronize } from '@db/sync/syncManager';
import {
  registerForPushNotifications,
  registerNotificationListeners,
} from '@lib/notifications/notificationHandler';
import { colors, radius } from '@src/theme';

import { Icon } from '@components/Icon';

import { SessionTimeoutHandler } from '@features/auth/components/SessionTimeoutHandler';

/**
 * @description Initials shown on the profile tab avatar, e.g. "Jane Doe" -> "JD".
 * @param username - Signed-in user's display name, if known.
 */
function getInitials(username: string | null): string {
  if (!username) return '?';
  const parts = username.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface TabProfileAvatarProps {
  focused: boolean;
}

function TabProfileAvatar({ focused }: TabProfileAvatarProps): React.JSX.Element {
  const { username } = useAuthStore();
  return (
    <View style={[avatarStyles.container, focused && avatarStyles.containerActive]}>
      <Text style={[avatarStyles.initials, focused && avatarStyles.initialsActive]}>
        {getInitials(username)}
      </Text>
    </View>
  );
}

/**
 * @description Layout for the (medtech) tab group. Redirects unauthenticated or
 * non-medtech sessions to login, keeps the local DB synced while active, and renders
 * the bottom tab bar (detail routes are hidden tabs reachable via push navigation).
 */
export default function MedTechLayout(): React.JSX.Element {
  const { isAuthenticated, role } = useAuthStore();
  const wasConnected = useRef<boolean | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isAuthenticated || role !== UserRole.MEDTECH) return;

    synchronize();
    registerForPushNotifications();
    const cleanupListeners = registerNotificationListeners();

    const appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') synchronize();
    });

    const netInfoUnsub = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected ?? false;
      if (isConnected && wasConnected.current === false) synchronize();
      wasConnected.current = isConnected;
    });

    return () => {
      appStateSub.remove();
      netInfoUnsub();
      cleanupListeners();
    };
  }, [isAuthenticated, role]);

  if (!isAuthenticated || role !== UserRole.MEDTECH) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <>
      <SessionTimeoutHandler />
      <Tabs
        // Detail screens (sample/[id], capture, reject, override) are hidden
        // tab routes reachable from more than one tab (Queue, Reports, Alerts).
        // The default backBehavior resolves "back" to the initial tab (Queue)
        // regardless of where the screen was actually opened from — "history"
        // makes back return to whichever tab you really came from.
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.teal,
          tabBarInactiveTintColor: colors.gray400,
          tabBarStyle: {
            backgroundColor: colors.white,
            borderTopColor: colors.gray200,
            borderTopWidth: 1,
            height: 56 + insets.bottom,
            paddingBottom: insets.bottom + 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="queue"
          options={{
            title: 'Queue',
            tabBarIcon: ({ color, size }) => <Icon name="list" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarIcon: ({ color, size }) => (
              <Icon name="document-text-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            title: 'Alerts',
            tabBarIcon: ({ color, size }) => (
              <Icon name="notifications-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => <TabProfileAvatar focused={focused} />,
          }}
        />
        {/* Hide detail screens from the tab bar */}
        {/* capture is still pushed to directly from Begin Analysis / Retake
            Image (sample/[id].tsx) — it just no longer has its own tab. */}
        <Tabs.Screen name="capture" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen
          name="sample/[id]"
          options={{ href: null, tabBarStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="sample/override/[id]"
          options={{ href: null, tabBarStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="sample/reject/[id]"
          options={{ href: null, tabBarStyle: { display: 'none' } }}
        />
      </Tabs>
    </>
  );
}

const avatarStyles = StyleSheet.create({
  container: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerActive: { backgroundColor: colors.teal },
  initials: { fontSize: 10, fontWeight: '700', color: colors.gray500 },
  initialsActive: { color: colors.white },
});
