import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import {
  MAX_OVERRIDE_COUNT,
  MAX_OVERRIDE_RATIONALE_LENGTH,
} from '../../constants/override.constant';
import { OVERRIDE_TEXT } from '../../constants/overrideText.constant';
import { parseOverrideCount } from '../../lib/overrideValidation';

export interface OverrideFormFieldsProps {
  originalAiValue: number;
  currentValue: number | null;
  correctedValue: string;
  onCorrectedValueChange: (value: string) => void;
  rationale: string;
  onRationaleChange: (value: string) => void;
  isEditable: boolean;
}

/**
 * @description The read-only AI value plus the corrected-value and rationale inputs.
 * @param originalAiValue - AI-reported value, shown read-only for reference.
 * @param currentValue - Latest effective value, which may include an earlier correction.
 * @param correctedValue - Current text of the corrected-value input.
 * @param onCorrectedValueChange - Called as the corrected-value input changes.
 * @param rationale - Current text of the rationale input.
 * @param onRationaleChange - Called as the rationale input changes.
 * @param isEditable - Disables both inputs during submission or after finalization.
 */
export function OverrideFormFields({
  originalAiValue,
  currentValue,
  correctedValue,
  onCorrectedValueChange,
  rationale,
  onRationaleChange,
  isEditable,
}: OverrideFormFieldsProps): React.JSX.Element {
  const correctedNum = parseOverrideCount(correctedValue);

  return (
    <>
      {/* Original AI value — always read-only */}
      <View style={styles.container}>
        <Text style={styles.fieldLabel}>{OVERRIDE_TEXT.aiValueLabel}</Text>
        <View style={styles.readOnlyField}>
          <Text
            accessibilityLabel={OVERRIDE_TEXT.getOriginalAiValueAccessibilityLabel(originalAiValue)}
            style={styles.readOnlyValue}
          >
            {originalAiValue}
          </Text>
          <Text style={styles.readOnlyNote}>{OVERRIDE_TEXT.aiValueReadonlyNote}</Text>
        </View>
      </View>
      {currentValue !== null && currentValue !== originalAiValue && (
        <Text style={styles.helper}>
          {OVERRIDE_TEXT.currentValuePrefix} {currentValue}
        </Text>
      )}

      {/* Corrected value input */}
      <View style={styles.container}>
        <Text style={styles.fieldLabel}>
          {OVERRIDE_TEXT.correctedValueLabel} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, correctedNum !== null && styles.inputValid]}
          value={correctedValue}
          onChangeText={onCorrectedValueChange}
          editable={isEditable}
          placeholder={OVERRIDE_TEXT.correctedValuePlaceholder}
          placeholderTextColor={colors.warmGray400}
          keyboardType="number-pad"
          returnKeyType="next"
          accessibilityLabel={OVERRIDE_TEXT.correctedValueAccessibilityLabel}
        />
        <Text style={styles.helper}>
          {OVERRIDE_TEXT.getCorrectedValueRangeHelper(MAX_OVERRIDE_COUNT)}
        </Text>
      </View>

      {/* Rationale input — required */}
      <View style={styles.container}>
        <Text style={styles.fieldLabel}>
          {OVERRIDE_TEXT.rationaleLabel} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={rationale}
          onChangeText={onRationaleChange}
          editable={isEditable}
          maxLength={MAX_OVERRIDE_RATIONALE_LENGTH}
          placeholder={OVERRIDE_TEXT.rationalePlaceholder}
          placeholderTextColor={colors.warmGray400}
          multiline
          numberOfLines={4}
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          accessibilityLabel={OVERRIDE_TEXT.rationaleAccessibilityLabel}
        />
        <Text style={styles.charCount}>
          {OVERRIDE_TEXT.getCharCountLabel(rationale.length, MAX_OVERRIDE_RATIONALE_LENGTH)}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
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
    borderColor: colors.gray300,
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
    minHeight: spacing.jumbo * 2 + spacing.md,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.micro,
    color: colors.warmGray500,
    textAlign: 'right',
  },
  readOnlyField: {
    backgroundColor: colors.cream,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
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
  helper: { ...typography.caption, color: colors.gray500 },
});
