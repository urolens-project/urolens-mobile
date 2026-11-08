import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { SAMPLE_TEXT } from '../constants/sampleText.constant';

export interface AwaitingWebVerificationCardProps {
  /** The supervisor's return reason, when the result was returned for correction. */
  returnReason?: string | null;
}

/**
 * @description Shown in place of the AI findings card for a multi-field result that
 * has been submitted (or returned) — correction and confirmation both happen on the
 * website now, not the phone (SDD Module 2 proposal, section 3.4).
 * @param returnReason - The supervisor's return reason, if the result was returned.
 */
export function AwaitingWebVerificationCard({
  returnReason,
}: AwaitingWebVerificationCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name="globe-outline" size={16} color={colors.blue800} />
        <Text style={styles.title}>{SAMPLE_TEXT.awaitingWebVerificationTitle}</Text>
      </View>
      <Text style={styles.body}>{SAMPLE_TEXT.awaitingWebVerificationBody}</Text>
      {returnReason && (
        <Text style={styles.reason}>
          {SAMPLE_TEXT.rejectionReasonLabel}: {returnReason}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.blue50,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.blue200,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  title: { ...typography.label, fontWeight: fontWeight.bold, color: colors.blue800 },
  body: { ...typography.body, color: colors.blue800, lineHeight: 18 },
  reason: {
    ...typography.body,
    color: colors.blue800,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
  },
});
