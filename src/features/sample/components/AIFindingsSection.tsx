import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import type { FindingRow } from '@features/result-confirmation/lib/findingRows';

export interface AIFindingsSectionProps {
  rows: FindingRow[];
}

/**
 * @description Lists the AI-detected particle counts for this result, flagging any
 * the medtech has manually overridden.
 * @param rows - One row per finding parameter.
 */
export function AIFindingsSection({ rows }: AIFindingsSectionProps): React.JSX.Element {
  return (
    <View style={styles.findingsRows}>
      {rows.map((row) => (
        <View key={row.key} style={styles.findingRow}>
          <View style={styles.findingDot} />
          <View style={styles.findingNameBlock}>
            <Text style={styles.findingName}>{row.label}</Text>
            {row.isOverridden && (
              <View style={styles.overriddenBadge}>
                <Text style={styles.overriddenBadgeText}>Overridden · AI: {row.aiCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.findingCount}>{row.count}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  findingsRows: { gap: spacing.sm },
  findingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  findingDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.teal,
  },
  findingNameBlock: { flex: 1, gap: spacing.xxs },
  findingName: { ...typography.body, color: colors.gray700 },
  findingCount: { ...typography.body, fontWeight: fontWeight.bold, color: colors.ink },
  // Same look as the override badge on the review screen's parameter rows.
  overriddenBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.violet100,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.xs,
  },
  overriddenBadgeText: { ...typography.micro, fontWeight: fontWeight.medium, color: colors.violet800 },
});
