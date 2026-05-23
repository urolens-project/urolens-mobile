import React, { useMemo, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueue } from '../../src/features/queue/hooks/useQueue';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { QueueItemCard } from '../../src/features/queue/components/QueueItemCard';
import { QueueFilterBar } from '../../src/features/queue/components/QueueFilterBar';
import { MOCK_QUEUE_ITEMS } from '../../src/mocks/queueMockData';
import type { FilterOption, QueueItem } from '../../src/features/queue/types';

const TEAL = '#2E7D7A';

// ── Toggle this to false to use real backend data ────────────────────────────
const USE_MOCK = false;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function abbreviateName(fullName: string): string {
  const parts = fullName.trim().split(' ');
  if (parts.length < 2) return fullName;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyState({ isOnline, filter }: { isOnline: boolean; filter: FilterOption }) {
  if (!isOnline) {
    return (
      <View style={styles.empty}>
        <Ionicons name="cloud-offline-outline" size={40} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>You're offline</Text>
        <Text style={styles.emptySub}>Connect to sync your latest queue.</Text>
      </View>
    );
  }
  if (filter !== 'ALL') {
    return (
      <View style={styles.empty}>
        <Ionicons name="filter-outline" size={40} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No matches</Text>
        <Text style={styles.emptySub}>Try selecting a different filter.</Text>
      </View>
    );
  }
  return (
    <View style={styles.empty}>
      <Ionicons name="checkmark-circle-outline" size={40} color="#D1D5DB" />
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allItems: QueueItem[] = USE_MOCK ? MOCK_QUEUE_ITEMS : dbItems;

  const items = useMemo<QueueItem[]>(() => {
    if (!USE_MOCK) return allItems;
    const today = new Date().toDateString();
    switch (filter) {
      case 'DATE':       return allItems.filter((i) => new Date(i.receivedAt).toDateString() === today);
      case 'PRIORITY':   return allItems.filter((i) => i.priorityLevel === 'HIGH' || i.priorityLevel === 'NORMAL' || i.priorityLevel === 'LOW');
      case 'HIGH':       return allItems.filter((i) => i.priorityLevel === 'HIGH');
      case 'NORMAL':     return allItems.filter((i) => i.priorityLevel === 'NORMAL' || i.priorityLevel === 'LOW');
      case 'STATUS':     return allItems;
      case 'ASSIGNED':   return allItems.filter((i) => i.status === 'ASSIGNED');
      case 'PROCESSING': return allItems.filter((i) => i.status === 'PROCESSING' || i.status === 'IN_PROGRESS');
      default:           return allItems;
    }
  }, [allItems, filter]);

  const counts = useMemo(() => ({
    assigned:   allItems.filter((i) => i.status === 'ASSIGNED').length,
    priority:   allItems.filter((i) => i.priorityLevel === 'HIGH').length,
    pending:    allItems.filter((i) => i.status === 'IN_QUEUE').length,
    inProgress: allItems.filter((i) => i.status === 'PROCESSING' || i.status === 'IN_PROGRESS').length,
  }), [allItems]);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  function handleItemPress(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function handleProceed() {
    if (selectedItem) router.push(`/(medtech)/sample/${selectedItem.id}`);
  }

  function handleReject() {
    if (selectedItem) router.push(`/(medtech)/sample/reject/${selectedItem.id}`);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Ionicons name="flask" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.appName}>LabFlow LIS</Text>
            <Text style={styles.appSub}>UroLens Diagnostics</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} accessibilityLabel="Sync">
            <Ionicons name="sync-outline" size={20} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} accessibilityLabel="Notifications">
            <View>
              <Ionicons name="notifications-outline" size={20} color="#374151" />
              <View style={styles.notifDot} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── List ── */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <QueueItemCard
            item={item}
            onPress={handleItemPress}
            selected={item.id === selectedId}
          />
        )}
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
            {/* Page title row */}
            <View style={styles.titleRow}>
              <Text style={styles.pageTitle}>My Sample Queue</Text>
              <Text style={styles.dateText}>{formatDate()}</Text>
            </View>

            {/* Role + count row */}
            <View style={styles.roleRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Medical Technologist</Text>
              </View>
              <Text style={styles.activeCount}>{allItems.length} Active Samples</Text>
            </View>

            {/* Online status pill */}
            <View style={styles.statusPillRow}>
              <View style={[styles.statusPill, !isOnline && styles.statusPillOffline]}>
                <View style={[styles.statusDot, !isOnline && styles.statusDotOffline]} />
                <Text style={[styles.statusText, !isOnline && styles.statusTextOffline]}>
                  {isOnline ? 'Online • Queue Synchronized' : 'Offline • Showing cached data'}
                </Text>
              </View>
            </View>

            {/* Stats card */}
            <View style={styles.statsCard}>
              <View style={styles.statsRow}>
                {[
                  { label: 'Assigned',  value: counts.assigned,   color: '#111827' },
                  { label: 'Priority',  value: counts.priority,   color: '#DC2626' },
                  { label: 'Pending',   value: counts.pending,    color: '#D97706' },
                  { label: 'Progress',  value: counts.inProgress, color: '#2563EB' },
                ].map((stat, i) => (
                  <View key={stat.label} style={[styles.statItem, i < 3 && styles.statDivider]}>
                    <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.syncRow}>
                <Text style={styles.syncText}>Last Sync: just now</Text>
                <TouchableOpacity>
                  <Text style={styles.analyticsLink}>View Analytics &gt;</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Filter bar */}
            <QueueFilterBar
              selected={filter}
              onChange={setFilter}
              counts={{
                ALL:        allItems.length,
                HIGH:       counts.priority,
                NORMAL:     allItems.filter((i) => i.priorityLevel === 'NORMAL' || i.priorityLevel === 'LOW').length,
                ASSIGNED:   counts.assigned,
                PROCESSING: counts.inProgress,
              }}
            />
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

      {/* ── Bottom action bar ── */}
      {selectedItem && (
        <View style={styles.actionBar}>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Selected: {selectedItem.sampleUid}</Text>
            <Text style={styles.actionSub}>
              {abbreviateName(selectedItem.patientName)} • {selectedItem.testType}
            </Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.proceedBtn} onPress={handleProceed}>
              <Text style={styles.proceedBtnText}>Proceed to Analysis</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 18,
  },
  appSub: {
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 15,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  // List
  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  listEmpty: {
    flex: 1,
  },

  // Page title
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 16,
    paddingBottom: 6,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Role row
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: TEAL,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activeCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },

  // Online status pill
  statusPillRow: {
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusPillOffline: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusDotOffline: {
    backgroundColor: '#D97706',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  statusTextOffline: {
    color: '#92400E',
  },

  // Stats card
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 4,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statDivider: {
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  syncText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  analyticsLink: {
    fontSize: 12,
    color: TEAL,
    fontWeight: '600',
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
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

  // Bottom action bar
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  actionInfo: {
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  actionSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  proceedBtn: {
    flex: 2,
    height: 46,
    borderRadius: 10,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proceedBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
