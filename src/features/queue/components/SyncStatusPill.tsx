import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';
import { PulseDot } from '@components/PulseDot';

import { SYNC_PILL_TONE_STYLES } from '../constants';
import type { SyncPill } from '../syncPill';

export interface SyncStatusPillProps {
  pill: SyncPill;
  /** Human-readable time since the last successful sync. */
  lastSync: string;
  /** Lets the dot pulse. Off for reduced motion or when the tab is out of view. */
  live: boolean;
}

/**
 * @description Whether the Queue is connected and in step with the server. A connected,
 * healthy pill pulses ("live"); a failed sync pulses too, to draw the eye; being offline
 * or not yet synced is a calm, still amber.
 * @param pill - Label and tone to render.
 * @param lastSync - Time since the last successful sync, shown beside the status.
 * @param live - Lets the dot pulse.
 */
export function SyncStatusPill({ pill, lastSync, live }: SyncStatusPillProps): React.JSX.Element {
  const tone = SYNC_PILL_TONE_STYLES[pill.tone];
  return (
    <View style={styles.container}>
      <View style={[styles.pill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
        <PulseDot color={tone.dot} size={8} live={live && pill.tone !== 'caution'} />
        <Text style={[styles.text, { color: tone.text }]}>{pill.label}</Text>
      </View>
      <View style={styles.syncRow}>
        <Icon name="time-outline" size={typography.body.fontSize} color={colors.gray400} />
        <Text style={styles.syncText}>Last Sync: {lastSync}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9, // TODO(theme): between spacing.sm(8)/smd(10); left exact.
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderWidth: 1,
    paddingHorizontal: 13, // TODO(theme): between spacing.md(12)/mlg(14); left exact.
    paddingVertical: spacing.sm - 1, // 7 — TODO(theme): between spacing.xs(4)/sm(8); left exact.
    borderRadius: radius.xxl,
  },
  text: {
    flexShrink: 1,
    ...typography.caption,
    fontWeight: fontWeight.semibold,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: '100%',
  },
  syncText: {
    flexShrink: 1,
    ...typography.micro,
    color: colors.gray400,
  },
});
