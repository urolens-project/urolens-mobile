import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

export interface OverrideFormFieldsProps {
  originalAiValue: number;
  correctedValue: string;
  onCorrectedValueChange: (value: string) => void;
  rationale: string;
  onRationaleChange: (value: string) => void;
}

/**
 * @description The read-only AI value plus the corrected-value and rationale inputs.
 * @param originalAiValue - AI-reported value, shown read-only for reference.
 * @param correctedValue - Current text of the corrected-value input.
 * @param onCorrectedValueChange - Called as the corrected-value input changes.
 * @param rationale - Current text of the rationale input.
 * @param onRationaleChange - Called as the rationale input changes.
 */
export function OverrideFormFields({
  originalAiValue,
  correctedValue,
  onCorrectedValueChange,
  rationale,
  onRationaleChange,
}: OverrideFormFieldsProps): React.JSX.Element {
  const correctedNum = parseFloat(correctedValue);

  return (
    <>
      {/* Original AI value — always read-only */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>AI-generated value</Text>
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyValue}>{originalAiValue}</Text>
          <Text style={styles.readOnlyNote}>Read-only — original preserved</Text>
        </View>
      </View>

      {/* Corrected value input */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>
          Corrected value <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, correctedValue.length > 0 && !isNaN(correctedNum) && styles.inputValid]}
          value={correctedValue}
          onChangeText={onCorrectedValueChange}
          placeholder="Enter corrected count"
          placeholderTextColor={colors.warmGray400}
          keyboardType="numeric"
          returnKeyType="next"
          accessibilityLabel="Corrected value"
        />
      </View>

      {/* Rationale input — required */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>
          Rationale <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={rationale}
          onChangeText={onRationaleChange}
          placeholder="Explain why you are overriding this value (required)"
          placeholderTextColor={colors.warmGray400}
          multiline
          numberOfLines={4}
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          accessibilityLabel="Rationale for override"
        />
        <Text style={styles.charCount}>{rationale.length} characters</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.bodyLg,
    fontWeight: fontWeight.medium,
    color: colors.ink,
  },
  required: {
    color: colors.red600,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.mlg,
    paddingVertical: spacing.mlg,
    fontSize: typography.title.fontSize,
    color: colors.ink,
  },
  inputValid: {
    borderColor: colors.teal,
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.micro,
    color: colors.warmGray500,
    textAlign: 'right',
  },
  readOnlyField: {
    backgroundColor: colors.cream,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.mlg,
    paddingVertical: spacing.mlg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readOnlyValue: {
    ...typography.title,
    color: colors.ink,
  },
  readOnlyNote: {
    ...typography.micro,
    color: colors.warmGray500,
    fontStyle: 'italic',
  },
});
