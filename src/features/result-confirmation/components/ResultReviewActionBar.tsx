import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, spacing } from '@src/theme';

export interface ResultReviewActionBarProps {
  bottomInset: number;
  isOnline: boolean;
  isConfirmed: boolean;
  isConfirming: boolean;
  onRetake: () => void;
  onConfirm: () => void;
  onContinue: () => void;
}

/**
 * @description Result review's floating bottom bar: Retake plus either Continue (once
 * confirmed) or Confirm/Queue Confirmation (while awaiting confirmation).
 * @param bottomInset - Safe-area bottom inset added to the bar's bottom padding.
 * @param isOnline - Swaps the confirm label between "Confirm Result" and "Queue Confirmation".
 * @param isConfirmed - Shows Continue instead of the confirm action once true.
 * @param isConfirming - Disables the confirm button and shows its running-diagnosis state.
 * @param onRetake - Starts the retake-image flow.
 * @param onConfirm - Confirms the result (or queues the confirmation while offline).
 * @param onContinue - Navigates back to sample detail once confirmed.
 */
export function ResultReviewActionBar({
  bottomInset,
  isOnline,
  isConfirmed,
  isConfirming,
  onRetake,
  onConfirm,
  onContinue,
}: ResultReviewActionBarProps): React.JSX.Element {
  return (
    <View style={[styles.actionBar, { paddingBottom: bottomInset + spacing.lg }]}>
      <TouchableOpacity
        style={styles.retakeButton}
        onPress={onRetake}
        accessible={true}
        accessibilityLabel="Retake image"
        accessibilityRole="button"
      >
        <Text style={styles.retakeButtonText}>Retake Image</Text>
      </TouchableOpacity>

      {isConfirmed ? (
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={onContinue}
          accessible={true}
          accessibilityLabel="Continue to sample detail"
          accessibilityRole="button"
        >
          <Text style={styles.confirmButtonText}>Continue</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.confirmButton, isConfirming && styles.confirmButtonBusy]}
          onPress={onConfirm}
          disabled={isConfirming}
          accessible={true}
          accessibilityLabel={
            isConfirming ? 'Running diagnosis' : isOnline ? 'Confirm Result' : 'Queue Confirmation'
          }
          accessibilityRole="button"
        >
          {isConfirming ? (
            <View style={styles.confirmingRow}>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={styles.confirmButtonText}>Running diagnosis...</Text>
            </View>
          ) : (
            <Text style={styles.confirmButtonText}>
              {isOnline ? 'Confirm Result' : 'Queue Confirmation'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 0.5,
    // TODO(theme): near-black hairline at 0.1 alpha not in palette.
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  retakeButton: {
    flex: 1,
    paddingVertical: spacing.mlg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray300,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  retakeButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray700,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: spacing.mlg,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: colors.teal,
  },
  confirmButtonBusy: {
    opacity: 0.75,
  },
  confirmingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
