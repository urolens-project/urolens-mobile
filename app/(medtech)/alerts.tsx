import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import apiClient from '@lib/apiClient';

const TEAL = '#2E7D7A';

interface NotificationItem {
  notification_id: string;
  message: string;
  notification_type: string;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

function notificationIcon(type: string): React.ComponentProps<typeof Ionicons>['name'] {
  switch (type) {
    case 'SAMPLE_ASSIGNED': return 'flask-outline';
    case 'RESULT_RETURNED': return 'return-down-back-outline';
    case 'RESULT_READY_FOR_REVIEW': return 'checkmark-circle-outline';
    case 'SMART_DIAGNOSIS_UNAVAILABLE': return 'warning-outline';
    default: return 'notifications-outline';
  }
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotificationCard({
  item,
  onPress,
}: {
  item: NotificationItem;
  onPress: (item: NotificationItem) => void;
}) {
  return (
    <Pressable
      style={[styles.card, !item.is_read && styles.cardUnread]}
      onPress={() => onPress(item)}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={notificationIcon(item.notification_type)}
          size={22}
          color={item.is_read ? '#9CA3AF' : TEAL}
        />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.message, !item.is_read && styles.messageUnread]}>
          {item.message}
        </Text>
        <Text style={styles.time}>{formatTime(item.created_at)}</Text>
      </View>
      {!item.is_read && <View style={styles.dot} />}
    </Pressable>
  );
}

export default function AlertsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get<NotificationItem[]>('/notifications');
      setNotifications(res.data);
      setError(null);
    } catch {
      setError('Could not load notifications.');
    }
  }, []);

  useEffect(() => {
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const markReadAndNavigate = useCallback(async (item: NotificationItem) => {
    if (!item.is_read) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === item.notification_id ? { ...n, is_read: true } : n,
        ),
      );
      apiClient
        .patch(`/notifications/${item.notification_id}/read`)
        .catch(() => {});
    }

    switch (item.notification_type) {
      case 'SAMPLE_ASSIGNED':
        router.push('/(medtech)/queue');
        break;
      case 'RESULT_RETURNED':
        if (item.entity_id) {
          router.push(`/(medtech)/sample/${item.entity_id}`);
        }
        break;
      default:
        break;
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color="#9CA3AF" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={handleRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.notification_id}
          renderItem={({ item }) => (
            <NotificationCard item={item} onPress={markReadAndNavigate} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={TEAL}
            />
          }
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No alerts yet</Text>
              <Text style={styles.emptySub}>
                Sample assignments and result updates will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  badge: {
    backgroundColor: TEAL,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  listContent: { paddingVertical: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 10 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151' },
  emptySub: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  errorText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: TEAL,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: TEAL },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FAFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  message: { fontSize: 14, color: '#374151', lineHeight: 20 },
  messageUnread: { fontWeight: '600', color: '#111827' },
  time: { fontSize: 12, color: '#9CA3AF' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEAL,
    marginTop: 6,
  },
});
