import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import type { QueueItem } from '@features/queue/types';
import { DetailRow } from '@features/sample/components/DetailRow';

import type { ResultReviewDetail } from '../types';

export interface ResultPatientSummaryProps {
  detail: ResultReviewDetail | null;
  specimen?: QueueItem;
}

/**
 * @description Identifies the patient and sample without exposing names that the MedTech API withholds.
 * @param props - Full review details and optional synced specimen fallback.
 */
export function ResultPatientSummary({
  detail,
  specimen,
}: ResultPatientSummaryProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="person-outline" size={16} color={colors.teal} />
        <Text accessibilityRole="header" style={styles.title}>
          Patient & Sample
        </Text>
      </View>
      <View style={styles.content}>
        <DetailRow
          label="Patient UID"
          value={detail?.patientUid || specimen?.patientUid || 'Unavailable'}
        />
        <View style={styles.divider} />
        <DetailRow
          label="Sample ID"
          value={detail?.sampleUid || specimen?.sampleUid || 'Unavailable'}
        />
        {detail?.patientAge != null && (
          <View>
            <View style={styles.divider} />
            <DetailRow label="Age" value={String(detail.patientAge)} />
          </View>
        )}
        {detail?.patientSex && (
          <View>
            <View style={styles.divider} />
            <DetailRow label="Sex" value={detail.patientSex} />
          </View>
        )}
        {specimen && (
          <View>
            <View style={styles.divider} />
            <DetailRow label="Test" value={specimen.testType} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    overflow: 'hidden',
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
  content: { padding: spacing.lg },
  title: { ...typography.label, color: colors.ink },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.gray200 },
});
