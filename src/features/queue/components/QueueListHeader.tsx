import { Animated, StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import { spacing } from '@src/theme';

import { RiseIn } from '@components/RiseIn';

import { QueueLoadState } from './QueueLoadState';
import { QueueStatsCard } from './QueueStatsCard';
import { SyncStatusPill } from './SyncStatusPill';
import type { RollAwayStyle } from '../scrollEffects';
import type { SyncPill } from '../syncPill';
import type { FilterOption } from '../types';

function formatLastSync(lastSyncAt: number | null): string {
  if (!lastSyncAt) return 'Not yet synced';
  const minutes = Math.max(0, Math.floor((Date.now() - lastSyncAt) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export interface QueueListHeaderProps {
  counts: { assigned: number; inProgress: number; returned: number };
  lastSyncAt: number | null;
  syncPill: SyncPill;
  playKey: number;
  reduceMotion: boolean;
  isLive: boolean;
  rollStyle?: RollAwayStyle;
  filtersHeight: number;
  hasItems: boolean;
  error: Error | null;
  isOnline: boolean;
  filter: FilterOption;
  onLayout: (event: LayoutChangeEvent) => void;
  onTopBlockLayout: (event: LayoutChangeEvent) => void;
  onRetry: () => Promise<void>;
}

/**
 * @description Shows live totals and sync feedback above the pinned queue filters.
 * @param props - Queue totals, sync and measured scroll layout.
 */
export function QueueListHeader({
  counts,
  lastSyncAt,
  syncPill,
  playKey,
  reduceMotion,
  isLive,
  rollStyle,
  filtersHeight,
  hasItems,
  error,
  isOnline,
  filter,
  onLayout,
  onTopBlockLayout,
  onRetry,
}: QueueListHeaderProps): React.JSX.Element {
  const filtersSpace = spacing.mlg + filtersHeight + spacing.sm;
  return (
    <View onLayout={onLayout}>
      <Animated.View style={[styles.container, rollStyle]} onLayout={onTopBlockLayout}>
        <RiseIn playKey={playKey} reduceMotion={reduceMotion} style={styles.pillRow}>
          <SyncStatusPill pill={syncPill} live={isLive} />
        </RiseIn>
        <RiseIn playKey={playKey} reduceMotion={reduceMotion} delay={80}>
          <QueueStatsCard
            counts={counts}
            lastSync={formatLastSync(lastSyncAt)}
            reduceMotion={reduceMotion}
          />
        </RiseIn>
        {hasItems && error && (
          <QueueLoadState
            isLoading={false}
            error={error}
            hasItems
            isOnline={isOnline}
            filter={filter}
            reduceMotion={reduceMotion}
            onRetry={onRetry}
          />
        )}
      </Animated.View>
      <View style={{ height: filtersSpace }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.mlg },
  pillRow: { paddingHorizontal: spacing.xxs },
});
