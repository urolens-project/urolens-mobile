import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { SAMPLE_TEXT } from '../constants/sampleText.constant';

export interface CapturingFieldsCardProps {
  acceptedCount: number;
  minFields: number;
}

/**
 * @description Shown in place of the AI findings card while a multi-field result is
 * still being collected (SDD Module 2 proposal) — there's nothing to review yet, only
 * progress toward the minimum.
 * @param acceptedCount - Accepted field count so far.
 * @param minFields - Minimum accepted fields required to submit.
 */
export function CapturingFieldsCard({
  acceptedCount,
  minFields,
}: CapturingFieldsCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name="camera-outline" size={16} color={colors.indigo800} />
        <Text style={styles.title}>{SAMPLE_TEXT.capturingFieldsTitle}</Text>
      </View>
      <Text style={styles.body}>
        {SAMPLE_TEXT.getCapturingFieldsBody(acceptedCount, minFields)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.indigo100,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.indigo100,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  title: { ...typography.label, fontWeight: fontWeight.bold, color: colors.indigo800 },
  body: { ...typography.body, color: colors.indigo800, lineHeight: 18 },
});
