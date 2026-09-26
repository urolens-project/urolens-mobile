import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, spacing, typography } from '@src/theme';

export interface DetailRowProps {
  label: string;
  value: string;
}

/**
 * @description One label/value line in the sample detail card.
 * @param label - Field name.
 * @param value - Field value, already formatted for display.
 */
export function DetailRow({ label, value }: DetailRowProps): React.JSX.Element {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.smd,
  },
  detailLabel: { ...typography.bodyLg, color: colors.warmGray500 },
  detailValue: {
    ...typography.bodyLg,
    fontWeight: fontWeight.medium,
    color: colors.ink,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.lg,
  },
});
