import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, View, Text } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@lib/auth/authStore';
import { UserRole } from '@app-types/enums';
import { SessionTimeoutHandler } from '@features/auth/components/SessionTimeoutHandler';
import { synchronize } from '@db/sync/syncManager';

const TEAL = '#2E7D7A';

function getInitials(username: string | null): string {
  if (!username) return '?';
  const parts = username.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function TabProfileAvatar({ focused }: { focused: boolean }) {
  const { username } = useAuthStore();
  return (
    <View style={{
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: focused ? TEAL : '#E5E7EB',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Text style={{
        fontSize: 10,
        fontWeight: '700',
        color: focused ? '#FFFFFF' : '#6B7280',
      }}>
        {getInitials(username)}
      </Text>
    </View>
  );
}

export default function MedTechLayout() {
  const { isAuthenticated, role } = useAuthStore();
  const wasConnected = useRef<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated || role !== UserRole.MEDTECH) return;

    synchronize();

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
    };
  }, [isAuthenticated, role]);

  if (!isAuthenticated || role !== UserRole.MEDTECH) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <>
      <SessionTimeoutHandler />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: TEAL,
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E5E7EB',
            borderTopWidth: 1,
            height: 80,
            paddingBottom: 20,
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
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="capture"
          options={{
            title: 'Capture',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="camera-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            title: 'Alerts',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => (
              <TabProfileAvatar focused={focused} />
            ),
          }}
        />
        {/* Hide detail screens from the tab bar */}
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
