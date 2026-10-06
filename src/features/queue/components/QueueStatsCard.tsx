import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { AnimatedCount } from '@components/AnimatedCount';
import { Icon } from '@components/Icon';

import { QUEUE_STATS_TILES, QUEUE_STATUS_STYLES } from '../constants';

export interface QueueStatsCardProps {
  counts: { assigned: number; inProgress: number; returned: number };
  reduceMotion: boolean;
}

/**
 * @description Where the Queue stands at a glance. Three tiles, one per status, in the
 * status colors used everywhere else; the numbers count to their new value when the
 * queue changes rather than jumping.
 * @param counts - Current count per status.
 * @param reduceMotion - Disables the count-up animation.
 */
export function QueueStatsCard({ counts, reduceMotion }: QueueStatsCardProps): React.JSX.Element {
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xxxl,
    padding: spacing.md,
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
    width: 14,
    height: 14,
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
});
