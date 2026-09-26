import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { AnimatedCount } from '@components/AnimatedCount';
import { Icon } from '@components/Icon';

import { QUEUE_STATS_TILES, QUEUE_STATUS_STYLES } from '../constants';

export interface QueueStatsCardProps {
  counts: { assigned: number; inProgress: number; returned: number };
  /** e.g. "5m ago" — shown as "Last Sync: 5m ago". */
  lastSync: string;
  reduceMotion: boolean;
}

/**
 * @description Where the Queue stands at a glance. Three tiles, one per status, in the
 * status colors used everywhere else; the numbers count to their new value when the
 * queue changes rather than jumping.
 * @param counts - Current count per status.
 * @param lastSync - Human-readable time since the last sync.
 * @param reduceMotion - Disables the count-up animation.
 */
export function QueueStatsCard({ counts, lastSync, reduceMotion }: QueueStatsCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.tiles}>
        {QUEUE_STATS_TILES.map(({ status, label, key }) => {
          const style = QUEUE_STATUS_STYLES[status];
          return (
            <View key={status} style={[styles.tile, { backgroundColor: style.wash }]}>
              <View style={[styles.chip, { backgroundColor: style.tint }]}>
                <Icon family="material-community" name={style.icon} size={16} color={style.color} />
              </View>
              <AnimatedCount
                value={counts[key]}
                reduceMotion={reduceMotion}
                style={[styles.value, { color: style.color }]}
              />
              <Text style={styles.label}>{label}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.syncRow}>
        <Icon name="time-outline" size={13} color={colors.gray400} />
        <Text style={styles.syncText}>Last Sync: {lastSync}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xxxl,
    padding: spacing.mlg,
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.smd,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
  },
  chip: {
    width: 28,
    height: 28,
    borderRadius: 14, // Half of width/height above — computed circle radius.
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    ...typography.display,
    lineHeight: 30,
  },
  label: {
    ...typography.micro,
    fontWeight: fontWeight.semibold,
    color: colors.gray500,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // TODO(theme): between spacing.xs(4)/sm(8); left exact.
    marginTop: spacing.md,
    paddingTop: spacing.smd,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  syncText: {
    ...typography.caption,
    color: colors.gray400,
  },
});
