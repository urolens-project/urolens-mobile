import React, { useCallback } from 'react';
import { View, SectionList, Text, RefreshControl, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReports } from '../../src/features/reports/hooks/useReports';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { ReportItemCard } from '../../src/features/reports/components/ReportItemCard';
import type { ReportItem, ReportSection } from '../../src/features/reports/types';

const TEAL = '#2E7D7A';

function EmptyState({ isOnline }: { isOnline: boolean }) {
  if (!isOnline) {
    return (
      <View style={styles.empty}>
        <Ionicons name="cloud-offline-outline" size={40} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>You&apos;re offline</Text>
        <Text style={styles.emptySub}>Connect to sync your finished samples.</Text>
      </View>
    );
  }
  return (
    <View style={styles.empty}>
      <Ionicons name="document-text-outline" size={40} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No reports yet</Text>
      <Text style={styles.emptySub}>
        Samples you&apos;ve confirmed, or that a supervisor has acted on, will show up here.
      </Text>
    </View>
  );
}

// This screen is read-only — cards open the existing (also read-only, for
// these statuses) sample detail view; nothing here mutates a sample.
export default function ReportsScreen() {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { sections, isLoading, totalCount, refresh, isRefreshing } = useReports();

  const handleItemPress = useCallback(
    (id: string) => {
      router.push(`/(medtech)/sample/${id}`);
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Reports</Text>
          <Text style={styles.headerSub}>Finished samples, read-only</Text>
        </View>
        {totalCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalCount}</Text>
          </View>
        )}
      </View>

      <SectionList<ReportItem, ReportSection>
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReportItemCard item={item} onPress={handleItemPress} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCountBadge}>
              <Text style={styles.sectionCountText}>{section.data.length}</Text>
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={TEAL}
            enabled={isOnline}
          />
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.list, sections.length === 0 && styles.listEmpty]}
        ListEmptyComponent={isLoading ? null : <EmptyState isOnline={isOnline} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  headerSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  badge: {
    backgroundColor: TEAL,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  listEmpty: {
    flex: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionCountBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },

  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
    paddingHorizontal: 32,
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
