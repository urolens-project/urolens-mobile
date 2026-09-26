import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

export interface OverrideFormActionsProps {
  originalAiValue: number;
  error: string | null;
  isValid: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * @description Preservation notice, any submit error, and the submit/cancel buttons.
 * @param originalAiValue - Shown in the preservation notice for context.
 * @param error - Submission error message, if any.
 * @param isValid - Whether the form's current values are submittable.
 * @param isSubmitting - Whether a submission is in flight.
 * @param onSubmit - Called when Submit is tapped.
 * @param onCancel - Called when Cancel is tapped.
 */
export function OverrideFormActions({
  originalAiValue,
  error,
  isValid,
  isSubmitting,
  onSubmit,
  onCancel,
}: OverrideFormActionsProps): React.JSX.Element {
  return (
    <>
      <View style={styles.notice}>
        <Icon name="information-circle-outline" size={16} color={colors.teal} style={styles.noticeIcon} />
        <Text style={styles.noticeText}>
          Both the original AI value ({originalAiValue}) and your corrected value will be stored
          and visible to the Supervisor.
        </Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle-outline" size={15} color={colors.red600} style={styles.noticeIcon} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitButton, (!isValid || isSubmitting) && styles.submitButtonDisabled]}
        onPress={onSubmit}
        disabled={!isValid || isSubmitting}
        accessibilityLabel="Submit override"
        accessibilityRole="button"
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={styles.submitButtonText}>Submit Override</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={onCancel}
        disabled={isSubmitting}
        accessibilityLabel="Cancel and go back to Analysis Result"
        accessibilityRole="button"
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
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
    borderWidth: 0.5,
    borderColor: 'rgba(46,125,122,0.25)',
    gap: spacing.sm,
  },
  noticeIcon: {
    marginTop: 1,
  },
  noticeText: {
    flex: 1,
    ...typography.body,
    color: colors.teal,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.red50,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.red200,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    ...typography.body,
    color: colors.red600,
    lineHeight: 18,
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
