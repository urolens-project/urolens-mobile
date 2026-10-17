import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { OVERRIDE_TEXT } from '../../constants/overrideText.constant';

export interface OverrideFormActionsProps {
  originalAiValue: number;
  error: string | null;
  validationError: string | null;
  isValid: boolean;
  isSubmitting: boolean;
  isOnline: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * @description Preservation notice, any submit error, and the submit/cancel buttons.
 * @param originalAiValue - Shown in the preservation notice for context.
 * @param error - Submission error message, if any.
 * @param validationError - Explains why the entered values cannot be submitted.
 * @param isValid - Whether the form's current values are submittable.
 * @param isSubmitting - Whether a submission is in flight.
 * @param isOnline - Distinguishes direct submission from an offline queued correction.
 * @param onSubmit - Called when Submit is tapped.
 * @param onCancel - Called when Cancel is tapped.
 */
export function OverrideFormActions({
  originalAiValue,
  error,
  validationError,
  isValid,
  isSubmitting,
  isOnline,
  onSubmit,
  onCancel,
}: OverrideFormActionsProps): React.JSX.Element {
  const submitLabel = OVERRIDE_TEXT.getSubmitLabel(isOnline);
  return (
    <>
      <View style={styles.notice}>
        <Icon name="information-circle-outline" color={colors.teal} />
        <Text style={styles.noticeText}>
          {OVERRIDE_TEXT.getOverrideNoticeText(originalAiValue)}
        </Text>
      </View>

      {validationError && (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {validationError}
        </Text>
      )}
      {error && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle-outline" color={colors.red600} />
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitButton, (!isValid || isSubmitting) && styles.submitButtonDisabled]}
        onPress={onSubmit}
        disabled={!isValid || isSubmitting}
        accessibilityLabel={submitLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: !isValid || isSubmitting, busy: isSubmitting }}
      >
        {isSubmitting ? (
          <ActivityIndicator
            accessibilityLabel={OVERRIDE_TEXT.savingAccessibilityLabel}
            size="small"
            color={colors.white}
          />
        ) : (
          <Text style={styles.submitButtonText}>{submitLabel}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={onCancel}
        disabled={isSubmitting}
        accessibilityLabel={OVERRIDE_TEXT.cancelAccessibilityLabel}
        accessibilityRole="button"
      >
        <Text style={styles.cancelButtonText}>{OVERRIDE_TEXT.cancelButtonText}</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.tealTint3,
    borderRadius: radius.md,
    padding: spacing.mlg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.tealTint8,
    gap: spacing.sm,
  },
  noticeText: {
    flex: 1,
    ...typography.body,
    color: colors.teal,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.red50,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.red200,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    ...typography.body,
    color: colors.red600,
  },
  submitButton: {
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: colors.teal,
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    ...typography.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  cancelButton: {
    paddingVertical: spacing.mlg,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.subtitle,
    color: colors.warmGray500,
  },
});
