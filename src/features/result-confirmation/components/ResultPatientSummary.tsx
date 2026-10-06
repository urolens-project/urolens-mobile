import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

import type { QueueItem } from '@features/queue/types';

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
      <Text style={styles.title}>Patient & sample</Text>
      <Text style={styles.body}>
        Patient UID: {detail?.patientUid || specimen?.patientUid || 'Unavailable'}
      </Text>
      <Text style={styles.body}>
        Sample ID: {detail?.sampleUid || specimen?.sampleUid || 'Unavailable'}
      </Text>
      {detail?.patientAge != null && <Text style={styles.body}>Age: {detail.patientAge}</Text>}
      {detail?.patientSex && <Text style={styles.body}>Sex: {detail.patientSex}</Text>}
      {specimen && <Text style={styles.body}>Test: {specimen.testType}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  title: { ...typography.label, color: colors.ink },
  body: { ...typography.bodyLg, color: colors.gray700 },
});
