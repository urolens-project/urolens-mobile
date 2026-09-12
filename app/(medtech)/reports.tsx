import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReports } from '../../src/features/reports/hooks/useReports';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { ReportCategoryCard } from '../../src/features/reports/components/ReportCategoryCard';
import { ReportItemCard } from '../../src/features/reports/components/ReportItemCard';
import { REPORT_CATEGORY_STYLES } from '../../src/features/reports/constants';
import type { ReportCategory } from '../../src/features/reports/types';

const TEAL = '#2E7D7A';

function EmptyCategoryState({ isOnline }: { isOnline: boolean }) {
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
      <Text style={styles.emptyTitle}>Nothing here yet</Text>
      <Text style={styles.emptySub}>Samples that reach this stage will show up here.</Text>
    </View>
  );
}

// This screen is read-only — cards open the existing (also read-only, for
// these statuses) sample detail view; nothing here mutates a sample.
export default function ReportsScreen() {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { sections, isLoading, totalCount, refresh, isRefreshing } = useReports();
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);

  const selectedSection = useMemo(
    () => sections.find((s) => s.category === selectedCategory) ?? null,
    [sections, selectedCategory],
  );

  const handleItemPress = useCallback(
    (id: string) => {
      router.push(`/(medtech)/sample/${id}`);
    },
    [router],
  );

  // ── Drilled into one category ──────────────────────────────────────────
  if (selectedCategory && selectedSection) {
    const style = REPORT_CATEGORY_STYLES[selectedCategory];
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.detailHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setSelectedCategory(null)}
            accessibilityRole="button"
            accessibilityLabel="Back to Reports"
          >
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.detailHeaderText}>
            <Text style={styles.detailTitle} numberOfLines={1}>
              {selectedSection.title}
            </Text>
            <Text style={styles.detailSub}>Read-only</Text>
          </View>
          <View style={[styles.detailBadge, { backgroundColor: style.tint }]}>
            <Text style={[styles.detailBadgeText, { color: style.color }]}>
              {selectedSection.data.length}
            </Text>
          </View>
        </View>

        <FlatList
          data={selectedSection.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ReportItemCard item={item} onPress={handleItemPress} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={TEAL}
              enabled={isOnline}
            />
          }
          contentContainerStyle={[
            styles.list,
            selectedSection.data.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={isLoading ? null : <EmptyCategoryState isOnline={isOnline} />}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    );
  }

  // ── Landing grid ────────────────────────────────────────────────────────
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

      <ScrollView
        contentContainerStyle={styles.gridScroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={TEAL}
            enabled={isOnline}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {sections.map((section) => (
            <ReportCategoryCard
              key={section.category}
              category={section.category}
              title={section.title}
              count={section.data.length}
              onPress={setSelectedCategory}
            />
          ))}
        </View>

        {!isOnline && (
          <View style={styles.offlineNote}>
            <Ionicons name="cloud-offline-outline" size={16} color="#92400E" />
            <Text style={styles.offlineNoteText}>Offline — showing cached data</Text>
          </View>
        )}
      </ScrollView>
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

  // Grid
  gridScroll: {
    padding: 16,
    paddingBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  offlineNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 18,
  },
  offlineNoteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },

  // Drilldown header
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeaderText: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  detailSub: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  detailBadge: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginRight: 10,
    minWidth: 26,
    alignItems: 'center',
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Drilldown list
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  listEmpty: {
    flex: 1,
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
