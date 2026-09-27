import { useCallback, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAuthStore } from '@lib/auth/authStore';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useReduceMotion } from '@components/DropReveal';

import { useReports } from '../hooks/useReports';
import { CategoryDrilldownView } from './CategoryDrilldownView';
import { ReportsLandingView } from './ReportsLandingView';
import type { ReportCategory } from '../types';

/**
 * @description Reports tab: category landing grid that drills into a per-category list.
 * Read-only — cards open the existing (also read-only, for these statuses) sample
 * detail view; nothing here mutates a sample.
 */
export function ReportsScreen(): React.JSX.Element {
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
    (id: string): void => {
      router.push(`/(medtech)/sample/${id}`);
    },
    [router],
  );
  const handleCategoryBack = useCallback((): void => setSelectedCategory(null), []);

  if (selectedCategory && selectedSection) {
    return (
      <CategoryDrilldownView
        category={selectedCategory}
        section={selectedSection}
        topInset={insets.top}
        playKey={playKey}
        reduceMotion={reduceMotion}
        isOnline={isOnline}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        onBack={handleCategoryBack}
        onItemPress={handleItemPress}
      />
    );
  }

  return (
    <ReportsLandingView
      username={username}
      totalCount={totalCount}
      topInset={insets.top}
      playKey={playKey}
      reduceMotion={reduceMotion}
      sections={sections}
      isOnline={isOnline}
      isRefreshing={isRefreshing}
      onRefresh={refresh}
      onSelectCategory={setSelectedCategory}
    />
  );
}
