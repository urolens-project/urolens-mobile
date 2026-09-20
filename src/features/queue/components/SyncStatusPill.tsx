import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PulseDot } from '@components/PulseDot';
import type { SyncPill, SyncPillTone } from '../syncPill';

interface Props {
  pill: SyncPill;
  // Lets the dot pulse. Off for reduced motion or when the tab is out of view.
  live: boolean;
}

const TONES: Record<SyncPillTone, { bg: string; border: string; dot: string; text: string }> = {
  ok: { bg: '#ECFDF5', border: '#A7F3D0', dot: '#10B981', text: '#065F46' },
  caution: { bg: '#FEF3C7', border: '#FDE68A', dot: '#D97706', text: '#92400E' },
  error: { bg: '#FEE2E2', border: '#FECACA', dot: '#DC2626', text: '#991B1B' },
};

// Whether the Queue is connected and in step with the server. A connected, healthy
// pill pulses ("live"); a failed sync pulses too, to draw the eye; being offline or
// not yet synced is a calm, still amber.
export function SyncStatusPill({ pill, live }: Props) {
  const tone = TONES[pill.tone];
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
    gap: 9,
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
