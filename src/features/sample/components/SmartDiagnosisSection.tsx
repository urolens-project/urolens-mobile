import { StyleSheet, Text, View } from 'react-native';

import type { SmartDiagnosisJson } from '@db/models/AnalysisResult';
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  HIGH: { bg: colors.red100, text: colors.red700 },
  MODERATE: { bg: colors.amber100, text: colors.amber800 },
  LOW: { bg: colors.emerald100, text: colors.emerald800 },
};
const LEVEL_LABELS: Record<string, string> = { HIGH: 'High', MODERATE: 'Moderate', LOW: 'Low' };
// A condition the engine gave no level for is neither low nor normal — don't dress it as Low.
const UNKNOWN_LEVEL_COLORS = { bg: colors.gray100, text: colors.gray500 };

export interface SmartDiagnosisSectionProps {
  diagnosis: SmartDiagnosisJson;
}

/**
 * @description Renders the Smart Diagnosis engine's per-condition levels, or a
 * "nothing significant" state when the engine found no indicators.
 * @param diagnosis - Parsed smart-diagnosis JSON for this analysis result.
 */
export function SmartDiagnosisSection({ diagnosis }: SmartDiagnosisSectionProps): React.JSX.Element {
  if (diagnosis.no_significant_indicators) {
    return (
      <View style={styles.noIndicators}>
        <Icon name="checkmark-circle-outline" size={16} color={colors.emerald800} />
        <Text style={styles.noIndicatorsText}>No significant diagnostic indicators found.</Text>
      </View>
    );
  }

  const conditions = [
    { label: 'Gout', level: diagnosis.gout?.level },
    { label: 'Glomerulonephritis', level: diagnosis.glomerulonephritis?.level },
    { label: 'Nephrolithiasis', level: diagnosis.nephrolithiasis?.level },
  ];

  return (
    <View style={styles.diagnosisRows}>
      {conditions.map((c) => {
        const levelColors = (c.level && LEVEL_COLORS[c.level]) || UNKNOWN_LEVEL_COLORS;
        return (
          <View key={c.label} style={styles.diagnosisRow}>
            <Text style={styles.diagnosisCondition}>{c.label}</Text>
            <View style={[styles.levelBadge, { backgroundColor: levelColors.bg }]}>
              <Text style={[styles.levelText, { color: levelColors.text }]}>
                {(c.level && (LEVEL_LABELS[c.level] ?? c.level)) || '—'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  noIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noIndicatorsText: { ...typography.body, color: colors.emerald800 },
  diagnosisRows: { gap: spacing.sm },
  diagnosisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diagnosisCondition: {
    ...typography.bodyLg,
    color: colors.ink,
    textTransform: 'capitalize',
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  levelText: { ...typography.micro, fontWeight: fontWeight.bold },
});
