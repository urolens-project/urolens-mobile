import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@src/theme';

import { REPORTS_TEXT } from '../constants/reportsText.constant';

interface ReportDataNoticeProps {
  isLoading: boolean;
  hasError: boolean;
}

/**
 * @description Keeps a loading or sync failure from looking like an empty report
 * history while leaving any previously cached records available to browse.
 * @param props - Initial loading and report/sync error states.
 */
export function ReportDataNotice({
  isLoading,
  hasError,
}: ReportDataNoticeProps): React.JSX.Element | null {
  if (hasError) {
    return (
      <View style={styles.container}>
        <Text style={styles.error} accessibilityRole="alert">
          {REPORTS_TEXT.syncErrorMessage}
        </Text>
      </View>
    );
  }
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          color={colors.teal}
          accessibilityLabel={REPORTS_TEXT.loadingAccessibilityLabel}
        />
        <Text style={styles.caption}>{REPORTS_TEXT.loadingCaption}</Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, paddingVertical: spacing.md, marginBottom: spacing.md },
  caption: { ...typography.body, color: colors.gray500, textAlign: 'center' },
  error: { ...typography.body, color: colors.red600 },
});
