import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { PulseDot } from '@components/PulseDot';

import { SYNC_PILL_TONE_STYLES } from '../constants';
import type { SyncPill } from '../syncPill';

export interface SyncStatusPillProps {
  pill: SyncPill;
  /** Lets the dot pulse. Off for reduced motion or when the tab is out of view. */
  live: boolean;
}

/**
 * @description Whether the Queue is connected and in step with the server. A connected,
 * healthy pill pulses ("live"); a failed sync pulses too, to draw the eye; being offline
 * or not yet synced is a calm, still amber.
 * @param pill - Label and tone to render.
 * @param live - Lets the dot pulse.
 */
export function SyncStatusPill({ pill, live }: SyncStatusPillProps): React.JSX.Element {
  const tone = SYNC_PILL_TONE_STYLES[pill.tone];
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <PulseDot color={tone.dot} size={8} live={live && pill.tone !== 'caution'} />
      <Text style={[styles.text, { color: tone.text }]}>{pill.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9, // TODO(theme): between spacing.sm(8)/smd(10); left exact.
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 13, // TODO(theme): between spacing.md(12)/mlg(14); left exact.
    paddingVertical: spacing.sm - 1, // 7 — TODO(theme): between spacing.xs(4)/sm(8); left exact.
    borderRadius: radius.xxl,
  },
  text: {
    ...typography.caption,
    fontWeight: fontWeight.semibold,
  },
});
