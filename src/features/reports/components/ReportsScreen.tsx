import { useCallback, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { useUsername } from '@lib/auth/authStore';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

import { useReduceMotion } from '@components/DropReveal';

import { useReports } from '../hooks/useReports';
import { CategoryDrilldownView } from './CategoryDrilldownView';
import { ReportsLandingView } from './ReportsLandingView';
import type { ReportCategory, ReportSection } from '../types';

/**
 * @description Reports tab: category landing grid that drills into a per-category list.
 * Opens sample details in read-only mode even when sync moves a report back to Queue.
 */
export function ReportsScreen(): React.JSX.Element {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { sections, isLoading, error, totalCount, refresh, isRefreshing } = useReports();
  const insets = useSafeAreaInsets();
  const username = useUsername();
  const reduceMotion = useReduceMotion();
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);

  // Bumped each time the tab is entered again, replaying the entrance
  // animation. The first entry plays from the components' own mount, so it's
  // skipped here to avoid starting it twice.
  const [playKey, setPlayKey] = useState(0);
  const selectedSection = useMemo(
    (): ReportSection | null =>
      sections.find((section): boolean => section.category === selectedCategory) ?? null,
    [sections, selectedCategory],
  );
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback((): void => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      setPlayKey((key): number => key + 1);
    }, []),
  );

  // Both the landing and the drilled-in header are teal, so the status bar needs
  // light text on this tab; every other tab is white with dark text. Tabs stay
  // mounted, so set it on focus and put it back on blur rather than relying on a
  // <StatusBar> element that only applies when it mounts.
  useFocusEffect(
    useCallback((): (() => void) => {
      StatusBar.setBarStyle('light-content', true);
      return (): void => StatusBar.setBarStyle('dark-content', true);
    }, []),
  );

  const handleItemPress = useCallback(
    (id: string): void => {
      router.push({
        pathname: '/(medtech)/sample/[id]',
        params: { id, readOnly: 'true' },
      });
    },
    [router],
  );
  const handleCategoryBack = useCallback((): void => setSelectedCategory(null), []);

  if (selectedCategory && selectedSection) {
    return (
      <CategoryDrilldownView
        key={selectedCategory}
        category={selectedCategory}
        section={selectedSection}
        topInset={insets.top}
        playKey={playKey}
        reduceMotion={reduceMotion}
        isOnline={isOnline}
        isLoading={isLoading}
        hasError={error !== null}
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
      isLoading={isLoading}
      hasError={error !== null}
      isRefreshing={isRefreshing}
      onRefresh={refresh}
      onSelectCategory={setSelectedCategory}
    />
  );
}
