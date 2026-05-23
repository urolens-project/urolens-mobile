import React, { useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueue } from '../../src/features/queue/hooks/useQueue';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { QueueItemCard } from '../../src/components/QueueItemCard';
import { QueueFilterBar } from '../../src/components/QueueFilterBar';
import { MOCK_QUEUE_ITEMS } from '../../src/mocks/queueMockData';
import type { FilterOption, QueueItem } from '../../src/features/queue/types';

const TEAL = '#2E7D7A';

// ── Toggle this to true to use mock data without a backend ──────────────────
const USE_MOCK = false;

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyState({ isOnline, filter }: { isOnline: boolean; filter: FilterOption }) {
  if (!isOnline) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📡</Text>
        <Text style={styles.emptyTitle}>You're offline</Text>
        <Text style={styles.emptySub}>Connect to sync your latest queue.</Text>
      </View>
    );
  }
  if (filter !== 'ALL') {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>No matches</Text>
        <Text style={styles.emptySub}>Try selecting a different filter.</Text>
      </View>
    );
  }
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>✅</Text>
      <Text style={styles.emptyTitle}>Queue is clear</Text>
      <Text style={styles.emptySub}>No samples are currently assigned to you.</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function QueueScreen() {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { items: dbItems, isLoading, filter, setFilter, refresh, isRefreshing } = useQueue();

  // In dev/mock mode bypass the DB and use static sample data
  const allItems: QueueItem[] = USE_MOCK ? MOCK_QUEUE_ITEMS : dbItems;

  // Apply the active filter client-side when using mock data
  const items = useMemo<QueueItem[]>(() => {
    if (!USE_MOCK) return allItems;
    switch (filter) {
      case 'HIGH':       return allItems.filter((i) => i.priorityLevel === 'HIGH');
      case 'NORMAL':     return allItems.filter((i) => i.priorityLevel === 'NORMAL' || i.priorityLevel === 'LOW');
      case 'ASSIGNED':   return allItems.filter((i) => i.status === 'ASSIGNED');
      case 'PROCESSING': return allItems.filter((i) => i.status === 'PROCESSING' || i.status === 'IN_PROGRESS');
      default:           return allItems;
    }
  }, [allItems, filter]);

  const counts = useMemo<Partial<Record<FilterOption, number>>>(() => ({
    ALL:        allItems.length,
    HIGH:       allItems.filter((i) => i.priorityLevel === 'HIGH').length,
    NORMAL:     allItems.filter((i) => i.priorityLevel === 'NORMAL' || i.priorityLevel === 'LOW').length,
    ASSIGNED:   allItems.filter((i) => i.status === 'ASSIGNED').length,
    PROCESSING: allItems.filter((i) => i.status === 'PROCESSING' || i.status === 'IN_PROGRESS').length,
  }), [allItems]);

  function handleItemPress(id: string) {
    router.push(`/(medtech)/sample/${id}`);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} accessibilityLabel="Menu">
          <Ionicons name="menu" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>UroLens</Text>
        <TouchableOpacity style={styles.avatarBtn} accessibilityLabel="Profile">
          <Ionicons name="person" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ── Offline banner ── */}
      {!isOnline && !USE_MOCK && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color="#92400E" />
          <Text style={styles.offlineBannerText}>Offline — showing cached data</Text>
        </View>
      )}

      {/* ── List ── */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <QueueItemCard item={item} onPress={handleItemPress} />}
        refreshControl={
          <RefreshControl
            refreshing={!USE_MOCK && isRefreshing}
            onRefresh={refresh}
            tintColor={TEAL}
            enabled={!USE_MOCK && isOnline}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Page header */}
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>Sample Queue</Text>
              <Text style={styles.pageSub}>Manage clinical specimens and priority diagnostics.</Text>
            </View>
            {/* Filter chips */}
            <QueueFilterBar selected={filter} onChange={setFilter} counts={counts} />
          </View>
        }
        ListEmptyComponent={
          isLoading && !USE_MOCK ? null : (
            <EmptyState isOnline={isOnline} filter={filter} />
          )
        }
        contentContainerStyle={[styles.list, items.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: TEAL,
    letterSpacing: 0.3,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Offline
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineBannerText: {
    fontSize: 13,
    color: '#92400E',
  },

  // Page header (inside list)
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // List
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listEmpty: {
    flex: 1,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  emptySub: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
