import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import {
  DIAGNOSIS_CONDITIONS,
  DIAGNOSIS_LEVEL_STYLES,
  UNKNOWN_DIAGNOSIS_LEVEL_STYLE,
} from '../constants/smartDiagnosis.constant';
import type { SmartDiagnosisResult } from '../types';

export interface SmartDiagnosisRowsProps {
  smartDiagnosis: SmartDiagnosisResult | null;
  isCompact?: boolean;
}

/**
 * @description Presents each condition with its rule inputs and a colored diagnosis level.
 * @param smartDiagnosis - Mapped diagnosis levels for this result.
 * @param isCompact - Fits rows inside an existing report card.
 */
export function SmartDiagnosisRows({
  smartDiagnosis,
  isCompact = false,
}: SmartDiagnosisRowsProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {DIAGNOSIS_CONDITIONS.map((item, index): React.JSX.Element => {
        const level = smartDiagnosis?.[item.scoreKey];
        const levelStyle = level ? DIAGNOSIS_LEVEL_STYLES[level] : UNKNOWN_DIAGNOSIS_LEVEL_STYLE;
        const isLast = index === DIAGNOSIS_CONDITIONS.length - 1;
        return (
          <View
            key={item.condition}
            style={[styles.row, isCompact && styles.rowCompact, isLast && styles.rowLast]}
            accessible
            accessibilityLabel={`${item.label}: ${levelStyle.label}`}
          >
            <View style={styles.text}>
              <Text style={styles.condition}>{item.label}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: levelStyle.backgroundColor }]}>
              <Text style={[styles.level, { color: levelStyle.color }]}>{levelStyle.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mlg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray100,
  },
  rowCompact: { paddingHorizontal: 0, paddingVertical: spacing.md },
  rowLast: { borderBottomWidth: 0 },
  text: { flex: 1, gap: spacing.xs },
  condition: { ...typography.bodyLg, fontWeight: fontWeight.semibold, color: colors.ink },
  description: { ...typography.caption, color: colors.warmGray500 },
  badge: { borderRadius: radius.sm, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs },
  level: { ...typography.caption, fontWeight: fontWeight.semibold },
});
