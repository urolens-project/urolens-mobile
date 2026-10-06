import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import type { SmartDiagnosisResult } from '../types';

export interface SmartDiagnosisPanelProps {
  smartDiagnosis: SmartDiagnosisResult | null;
  unavailable: boolean;
  emptyMessage?: string;
}

/**
 * @description Displays diagnosis scores or a clear, stage-appropriate notice when no diagnosis is available.
 * @param props - Diagnosis values, engine availability and optional waiting-state notice.
 */
export function SmartDiagnosisPanel({
  smartDiagnosis,
  unavailable,
  emptyMessage,
}: SmartDiagnosisPanelProps): React.JSX.Element {
  let content: React.JSX.Element;
  if (unavailable || !smartDiagnosis) {
    content = (
      <View style={styles.notice}>
        <Icon name="information-circle-outline" color={colors.teal} />
        <View style={styles.noticeText}>
          <Text style={styles.title}>
            {unavailable ? 'Diagnosis unavailable' : 'Smart Diagnosis'}
          </Text>
          <Text style={styles.body}>
            {emptyMessage || 'Smart Diagnosis is unavailable for this sample.'}
          </Text>
        </View>
      </View>
    );
  } else if (smartDiagnosis.noSignificantIndicators) {
    content = (
      <Text style={styles.body}>
        No significant clinical indicators detected. All scores within normal range.
      </Text>
    );
  } else {
    content = (
      <View style={styles.scores}>
        <Text style={styles.body}>Gout: {smartDiagnosis.goutScore ?? 'Unavailable'}</Text>
        <Text style={styles.body}>
          Glomerulonephritis: {smartDiagnosis.gnScore ?? 'Unavailable'}
        </Text>
        <Text style={styles.body}>
          Nephrolithiasis: {smartDiagnosis.nephroScore ?? 'Unavailable'}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Diagnosis</Text>
      <Text style={styles.caption}>Clinical decision support • Subject to supervisor review</Text>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    margin: spacing.lg,
    gap: spacing.md,
  },
  title: { ...typography.label, color: colors.ink },
  body: { ...typography.bodyLg, color: colors.gray700 },
  caption: { ...typography.caption, color: colors.gray500 },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.tealTint,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  noticeText: { flex: 1, gap: spacing.xs },
  scores: { gap: spacing.sm },
});
