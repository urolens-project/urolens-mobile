import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

import { RESULT_CONFIRMATION_TEXT } from '../constants/resultConfirmationText.constant';

export interface ResultReviewActionBarProps {
  bottomInset: number;
  onContinue: () => void;
}

/**
 * @description Bottom bar for result review, now read-only: every status this screen
 * renders is already past the MedTech's own sign-off (mobile PR #55 review, #3), so
 * the only action left is returning to the Confirmation Queue.
 * @param props - Safe-area bottom inset and the back-to-queue handler.
 */
export function ResultReviewActionBar({
  bottomInset,
  onContinue,
}: ResultReviewActionBarProps): React.JSX.Element {
  const actionText = RESULT_CONFIRMATION_TEXT.actionBar;
  return (
    <View style={[styles.container, { paddingBottom: bottomInset + spacing.lg }]}>
      <TouchableOpacity
        style={styles.confirmButton}
        onPress={onContinue}
        accessibilityLabel={actionText.continueLabel}
        accessibilityRole="button"
      >
        <Text style={styles.confirmText}>{actionText.continueLabel}</Text>
      </TouchableOpacity>
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
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.mlg,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.teal,
  },
  confirmText: { ...typography.label, color: colors.white },
});
