import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  Text,
  RefreshControl,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReports } from '../../src/features/reports/hooks/useReports';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useAuthStore } from '@lib/auth/authStore';
import {
  CARD_RADIUS,
  ReportCategoryCard,
} from '../../src/features/reports/components/ReportCategoryCard';
import { ReportItemCard } from '../../src/features/reports/components/ReportItemCard';
import { CategoryHeader } from '../../src/features/reports/components/CategoryHeader';
import { CurvedHeader } from '../../src/features/reports/components/CurvedHeader';
import { ReportIllustration } from '../../src/features/reports/components/ReportIllustration';
import { DropReveal, useReduceMotion } from '../../src/features/reports/components/DropReveal';
import { REPORT_CATEGORY_STYLES } from '../../src/features/reports/constants';
import type { ReportCategory } from '../../src/features/reports/types';

const TEAL = '#2E7D7A';

// Number of list items that get the drop-in entrance; anything further down
// is just shown, so scrolling a long list never re-triggers animation.
const ANIMATED_ITEMS = 8;
const ITEM_STAGGER_MS = 90;

function EmptyCategoryState({
  category,
  isOnline,
  reduceMotion,
}: {
  category: ReportCategory;
  isOnline: boolean;
  reduceMotion: boolean;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyArt}>
        <ReportIllustration category={category} animate={!reduceMotion} />
      </View>
      {isOnline ? (
        <>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptySub}>Samples that reach this stage will show up here.</Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>You&apos;re offline</Text>
          <Text style={styles.emptySub}>Connect to sync your finished samples.</Text>
        </>
      )}
    </View>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

// This screen is read-only — cards open the existing (also read-only, for
// these statuses) sample detail view; nothing here mutates a sample.
export default function ReportsScreen() {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { sections, isLoading, totalCount, refresh, isRefreshing } = useReports();
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const insets = useSafeAreaInsets();
  const username = useAuthStore((state) => state.username);
  const reduceMotion = useReduceMotion();

  // Bumped each time the tab is entered again, replaying the entrance
  // animation. The first entry plays from the components' own mount, so it's
  // skipped here to avoid starting it twice.
  const [playKey, setPlayKey] = useState(0);
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      setPlayKey((key) => key + 1);
    }, []),
  );

  const selectedSection = useMemo(
    () => sections.find((s) => s.category === selectedCategory) ?? null,
    [sections, selectedCategory],
  );

  // Both the landing and the drilled-in header are teal, so the status bar needs
  // light text on this tab; every other tab is white with dark text. Tabs stay
  // mounted, so set it on focus and put it back on blur rather than relying on a
  // <StatusBar> element that only applies when it mounts.
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content', true);
      return () => StatusBar.setBarStyle('dark-content', true);
    }, []),
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
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <CategoryHeader
          category={selectedCategory}
          title={selectedSection.title}
          count={selectedSection.data.length}
          topInset={insets.top}
          onBack={() => setSelectedCategory(null)}
          playKey={playKey}
          reduceMotion={reduceMotion}
        />

        <FlatList
          data={selectedSection.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <DropReveal
              index={index}
              playKey={playKey}
              reduceMotion={reduceMotion || index >= ANIMATED_ITEMS}
              accent={style.color}
              radius={18}
              staggerMs={ITEM_STAGGER_MS}
            >
              <ReportItemCard item={item} onPress={handleItemPress} />
            </DropReveal>
          )}
          ItemSeparatorComponent={ItemSeparator}
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
          ListEmptyComponent={
            isLoading ? null : (
              <EmptyCategoryState
                category={selectedCategory}
                isOnline={isOnline}
                reduceMotion={reduceMotion}
              />
            )
          }
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    );
  }

  // ── Landing (category cards) ───────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <CurvedHeader
        username={username}
        totalCount={totalCount}
        topInset={insets.top}
        playKey={playKey}
        reduceMotion={reduceMotion}
      />

      <ScrollView
        contentContainerStyle={styles.categoryScroll}
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
        <View style={styles.categoryList}>
          {sections.map((section, index) => (
            <DropReveal
              key={section.category}
              index={index}
              playKey={playKey}
              reduceMotion={reduceMotion}
              accent={REPORT_CATEGORY_STYLES[section.category].color}
              radius={CARD_RADIUS}
            >
              <ReportCategoryCard
                category={section.category}
                title={section.title}
                count={section.data.length}
                onPress={setSelectedCategory}
                animate={!reduceMotion}
              />
            </DropReveal>
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
  // Category list (full-width stacked cards)
  categoryScroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },
  categoryList: {
    flexDirection: 'column',
    gap: 14,
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

  // Drilldown list
  list: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
  },
  separator: {
    height: 12,
  },
  listEmpty: {
    flex: 1,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 36,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyArt: {
    marginBottom: 8,
    transform: [{ scale: 1.25 }],
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
