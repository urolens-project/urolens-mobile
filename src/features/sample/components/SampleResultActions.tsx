import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

export interface SampleResultActionsProps {
  canConfirm: boolean;
  canRetake: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  onRetake: () => void;
}

/**
 * @description Confirm/Retake row shown while a result is still pending the medtech's
 * sign-off, or after a supervisor has returned it for correction.
 * @param canConfirm - Whether the Confirm button should render.
 * @param canRetake - Whether the Retake Image button should render.
 * @param isConfirming - Shows a spinner on Confirm and disables it while a confirm is in flight.
 * @param onConfirm - Called when Confirm is pressed.
 * @param onRetake - Called when Retake Image is pressed.
 */
export function SampleResultActions({
  canConfirm,
  canRetake,
  isConfirming,
  onConfirm,
  onRetake,
}: SampleResultActionsProps): React.JSX.Element | null {
  if (!canConfirm && !canRetake) return null;

  return (
    <View style={styles.resultActions}>
      {canConfirm && (
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={onConfirm}
          disabled={isConfirming}
          accessibilityRole="button"
          accessibilityLabel="Confirm analysis result"
        >
          {isConfirming ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.confirmBtnText}>Confirm Result</Text>
          )}
        </TouchableOpacity>
      )}
      {canRetake && (
        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={onRetake}
          accessibilityRole="button"
          accessibilityLabel="Retake image"
        >
          <Text style={styles.retakeBtnText}>Retake Image</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  resultActions: { gap: spacing.smd, marginTop: spacing.xs },
  retakeBtn: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.lg,
    paddingVertical: spacing.mlg,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  retakeBtnText: { ...typography.subtitle, fontWeight: fontWeight.semibold, color: colors.gray700 },
  confirmBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.lg,
    paddingVertical: spacing.mlg,
    alignItems: 'center',
  },
  confirmBtnText: { ...typography.subtitle, fontWeight: fontWeight.bold, color: colors.white },
});
