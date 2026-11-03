import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

import { formatParticleName, getParticleColor } from '../lib/particleColor';
import type { Detection } from '../types';

export interface ParticleLegendProps {
  detections: Detection[];
}

/**
 * @description Legend for the analysis overlay's bounding boxes — one entry per
 * sediment particle type actually detected in this field's image, each swatch
 * colored to match its box in DetectionOverlay (field-post-analysis-report.md,
 * Section 2 item 2). Renders nothing when the field has no detections.
 * @param detections - AI boxes for the currently displayed field.
 */
export function ParticleLegend({ detections }: ParticleLegendProps): React.JSX.Element | null {
  const particleTypes = Array.from(new Set(detections.map((d) => d.particleType))).sort();
  if (particleTypes.length === 0) return null;

  return (
    <View style={styles.container}>
      {particleTypes.map((particleType) => (
        <View key={particleType} style={styles.entry}>
          <View style={[styles.swatch, { backgroundColor: getParticleColor(particleType) }]} />
          <Text style={styles.label}>{formatParticleName(particleType)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.smd,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  entry: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: 10, height: 10, borderRadius: radius.xs },
  label: { ...typography.caption, color: colors.gray700 },
});
