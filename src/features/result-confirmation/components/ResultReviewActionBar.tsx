import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

export interface ResultReviewActionBarProps {
  bottomInset: number;
  isOnline: boolean;
  isConfirmed: boolean;
  isConfirming: boolean;
  isReturned?: boolean;
  onRetake: () => void;
  onConfirm: () => void;
  onContinue: () => void;
}

/**
 * @description Offers review actions only while editable, and distinguishes resubmission from first confirmation.
 * @param props - Connectivity, result stage and guarded action handlers.
 */
export function ResultReviewActionBar({
  bottomInset,
  isOnline,
  isConfirmed,
  isConfirming,
  isReturned = false,
  onRetake,
  onConfirm,
  onContinue,
}: ResultReviewActionBarProps): React.JSX.Element {
  let confirmLabel = isOnline ? 'Confirm Result' : 'Queue Confirmation';
  if (isReturned) confirmLabel = 'Re-confirm & Submit';
  if (isConfirming) confirmLabel = 'Saving & submitting…';
  return (
    <View style={[styles.container, { paddingBottom: bottomInset + spacing.lg }]}>
      {!isConfirmed && (
        <TouchableOpacity
          style={styles.retakeButton}
          onPress={onRetake}
          disabled={isConfirming}
          accessibilityLabel="Retake image"
          accessibilityRole="button"
        >
          <Text style={styles.retakeText}>Retake Image</Text>
        </TouchableOpacity>
      )}
      {isConfirmed ? (
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={onContinue}
          accessibilityLabel="Back to Confirmation Queue"
          accessibilityRole="button"
        >
          <Text style={styles.confirmText}>Continue</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.confirmButton, isConfirming && styles.confirmButtonBusy]}
          onPress={onConfirm}
          disabled={isConfirming}
          accessibilityLabel={confirmLabel}
          accessibilityRole="button"
        >
          {isConfirming && <ActivityIndicator size="small" color={colors.white} />}
          <Text style={styles.confirmText}>{confirmLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
  retakeButton: {
    flex: 1,
    padding: spacing.mlg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray300,
    alignItems: 'center',
  },
  retakeText: { ...typography.subtitle, color: colors.gray700 },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.mlg,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.teal,
  },
  confirmButtonBusy: { opacity: 0.75 },
  confirmText: { ...typography.label, color: colors.white },
});
