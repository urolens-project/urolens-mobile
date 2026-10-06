import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, spacing, typography, fontWeight } from '@src/theme';

import { Icon } from '@components/Icon';

export interface ResultReviewTitleBarProps {
  topInset: number;
  isConfirmed: boolean;
  subtitle?: string;
  onBack: () => void;
}

/**
 * @description Result review's top bar: back button plus a subtitle reflecting whether
 * the result is still awaiting the medtech's confirmation or already submitted.
 * @param topInset - Safe-area top inset added to the bar's top padding.
 * @param isConfirmed - Whether the result has already been confirmed.
 * @param subtitle - Specific stage label when the result has moved through review.
 * @param onBack - Navigates back to the Confirmation Queue.
 */
export function ResultReviewTitleBar({
  topInset,
  isConfirmed,
  subtitle,
  onBack,
}: ResultReviewTitleBarProps): React.JSX.Element {
  return (
    <View style={[styles.container, { paddingTop: topInset + spacing.md }]}>
      <TouchableOpacity
        style={styles.titleBarBack}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back to Confirmation Queue"
      >
        <Icon name="chevron-back" size={26} color={colors.teal} />
      </TouchableOpacity>
      <View style={styles.titleBarContent}>
        <Text style={styles.titleBarText}>Analysis Result</Text>
        <Text style={styles.titleBarSub}>
          {subtitle ??
            (isConfirmed ? 'Submitted for Supervisor approval' : 'Pending your confirmation')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
    backgroundColor: colors.cream,
  },
  titleBarBack: {
    width: spacing.jumbo,
    height: spacing.jumbo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBarContent: {
    flex: 1,
    paddingRight: spacing.jumbo,
  },
  titleBarText: {
    ...typography.titleLg,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  titleBarSub: {
    ...typography.body,
    color: colors.warmGray500,
    marginTop: spacing.xxs,
  },
});
