import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import type { SmartDiagnosisResult } from '../types';
import { SmartDiagnosisRows } from './SmartDiagnosisRows';

export interface SmartDiagnosisPanelProps {
  smartDiagnosis: SmartDiagnosisResult | null;
  unavailable: boolean;
  emptyMessage?: string;
  isPreview?: boolean;
}

/**
 * @description Displays diagnosis scores or a clear, stage-appropriate notice when no diagnosis is available.
 * @param props - Diagnosis values, engine availability and optional waiting-state notice.
 */
export function SmartDiagnosisPanel({
  smartDiagnosis,
  unavailable,
  emptyMessage,
  isPreview = false,
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
      <Text style={[styles.body, styles.message]}>No significant diagnostic indicators found.</Text>
    );
  } else {
    content = <SmartDiagnosisRows smartDiagnosis={smartDiagnosis} />;
  }
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="trending-up" size={16} color={colors.teal} />
        <Text style={styles.title}>Smart Diagnosis</Text>
        <Text style={styles.caption}>{isPreview ? 'Preview' : 'Supervisor review'}</Text>
      </View>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    overflow: 'hidden',
    margin: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.creamAlt,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  title: { ...typography.label, color: colors.ink },
  body: { ...typography.bodyLg, color: colors.gray700 },
  caption: {
    ...typography.micro,
    color: colors.warmGray500,
    fontStyle: 'italic',
    marginLeft: 'auto',
  },
  message: { padding: spacing.lg },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.tealTint,
    padding: spacing.md,
    borderRadius: radius.md,
    margin: spacing.lg,
  },
  noticeText: { flex: 1, gap: spacing.xs },
});
