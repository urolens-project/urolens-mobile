import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@src/theme';

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
          Reports could not be updated. Showing available records. Pull down to try syncing again.
        </Text>
      </View>
    );
  }
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.teal} accessibilityLabel="Loading reports" />
        <Text style={styles.caption}>Loading reports…</Text>
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
