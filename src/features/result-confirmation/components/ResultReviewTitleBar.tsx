import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, spacing } from '@src/theme';

import { Icon } from '@components/Icon';

export interface ResultReviewTitleBarProps {
  topInset: number;
  isConfirmed: boolean;
  onBack: () => void;
}

/**
 * @description Result review's top bar: back button plus a subtitle reflecting whether
 * the result is still awaiting the medtech's confirmation or already submitted.
 * @param topInset - Safe-area top inset added to the bar's top padding.
 * @param isConfirmed - Whether the result has already been confirmed.
 * @param onBack - Navigates back to the sample detail screen.
 */
export function ResultReviewTitleBar({
  topInset,
  isConfirmed,
  onBack,
}: ResultReviewTitleBarProps): React.JSX.Element {
  return (
    <View style={[styles.titleBar, { paddingTop: topInset + 12 }]}>
      <TouchableOpacity
        style={styles.titleBarBack}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back to sample detail"
      >
        <Icon name="chevron-back" size={26} color={colors.teal} />
      </TouchableOpacity>
      <View style={styles.titleBarContent}>
        <Text style={styles.titleBarText}>Analysis Result</Text>
        <Text style={styles.titleBarSub}>
          {isConfirmed ? 'Submitted for Supervisor approval' : 'Pending your confirmation'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 0.5,
    // TODO(theme): near-black hairline at 0.08 alpha not in palette.
    borderBottomColor: 'rgba(0,0,0,0.08)',
    backgroundColor: colors.cream,
  },
  titleBarBack: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBarContent: {
    flex: 1,
    paddingRight: 44,
  },
  titleBarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  titleBarSub: {
    fontSize: 13,
    color: colors.warmGray500,
    marginTop: 2,
  },
});
