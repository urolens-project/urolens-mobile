// app/(medtech)/queue.tsx
import React, { useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueue } from '../../src/features/queue/hooks/useQueue'//'@features/queue/hooks/useQueue';
import { QueueItemCard } from '../../src/components/QueueItemCard'//'@features/queue/components/QueueItemCard';
import { QueueFilterBar } from '../../src/components/QueueFilterBar'//'@features/queue/components/QueueFilterBar';
//import { useNetworkStatus } from //'@hooks/useNetworkStatus';
import type { FilterOption, QueueItem } from '../../src/features/queue/types'//'@features/queue/types';
 
function EmptyState({ isOnline, filter }: { isOnline: boolean; filter: FilterOption }) {
  if (!isOnline) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📡</Text>
        <Text style={styles.emptyTitle}>No samples in queue</Text>
        <Text style={styles.emptySubtitle}>Connect to sync your latest queue.</Text>
      </View>
    );
  }
  if (filter !== 'ALL') {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>No samples match this filter</Text>
        <Text style={styles.emptySubtitle}>Try selecting a different filter above.</Text>
      </View>
    );
  }
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>✅</Text>
      <Text style={styles.emptyTitle}>Queue is clear</Text>
      <Text style={styles.emptySubtitle}>No samples are currently assigned to you.</Text>
    </View>
  );
}
 
export default function QueueScreen() {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { items, isLoading, filter, setFilter, refresh, isRefreshing } = useQueue();
 
  // Compute counts per filter for the filter bar badges
  const counts = useMemo<Partial<Record<FilterOption, number>>>(() => {
    const all = items.length;
    const high = items.filter((i) => i.priorityLevel === 'HIGH').length;
    const normal = items.filter((i) => i.priorityLevel !== 'HIGH').length;
    const assigned = items.filter((i) => i.status === 'ASSIGNED').length;
    const processing = items.filter((i) => i.status === 'PROCESSING').length;
    return { ALL: all, HIGH: high, NORMAL: normal, ASSIGNED: assigned, PROCESSING: processing };
  }, [items]);
 
  function handleItemPress(id: string) {
    router.push(`/(medtech)/sample/${id}`);
  }
 
  function renderItem({ item }: { item: QueueItem }) {
    return <QueueItemCard item={item} onPress={handleItemPress} />;
  }
 
  function keyExtractor(item: QueueItem) {
    return item.id;
  }
 
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
 
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Queue</Text>
        {!isOnline && (
          <View style={styles.offlinePill}>
            <Text style={styles.offlinePillText}>Offline</Text>
          </View>
        )}
      </View>
 
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            You're offline. Showing locally cached data.
          </Text>
        </View>
      )}
 
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor="#185FA5"
            enabled={isOnline}
          />
        }
        ListHeaderComponent={
          <QueueFilterBar
            selected={filter}
            onChange={setFilter}
            counts={counts}
          />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState isOnline={isOnline} filter={filter} />
          )
        }
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
 
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F6F3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F7F6F3',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  offlinePill: {
    backgroundColor: '#FAEEDA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlinePillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#854F0B',
  },
  offlineBanner: {
    backgroundColor: '#FAEEDA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#FAC775',
    marginBottom: 4,
  },
  offlineBannerText: {
    fontSize: 13,
    color: '#854F0B',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888780',
    textAlign: 'center',
  },
});
 
