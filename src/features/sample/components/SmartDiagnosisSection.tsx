import { StyleSheet, Text, View } from 'react-native';

import type { SmartDiagnosisJson } from '@db/models/AnalysisResult';
import { colors, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { SmartDiagnosisRows } from '@features/result-confirmation/components/SmartDiagnosisRows';
import { mapSmartDiagnosis } from '@features/result-confirmation/mappers/resultReview.mapper';

export interface SmartDiagnosisSectionProps {
  diagnosis: SmartDiagnosisJson;
}

/**
 * @description Displays diagnosis levels consistently within the report's existing card.
 * @param diagnosis - Parsed smart-diagnosis JSON for this analysis result.
 */
export function SmartDiagnosisSection({
  diagnosis,
}: SmartDiagnosisSectionProps): React.JSX.Element {
  const smartDiagnosis = mapSmartDiagnosis(diagnosis);
  if (smartDiagnosis?.noSignificantIndicators) {
    return (
      <View style={styles.container}>
        <Icon name="checkmark-circle-outline" size={16} color={colors.emerald800} />
        <Text style={styles.message}>No significant diagnostic indicators found.</Text>
      </View>
    );
  }
  return <SmartDiagnosisRows smartDiagnosis={smartDiagnosis} isCompact />;
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  message: { ...typography.body, color: colors.emerald800 },
});
