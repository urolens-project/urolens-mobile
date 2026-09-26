import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@src/theme';

export interface UploadProgressViewProps {
  progress: number;
}

/**
 * @description Full-screen progress indicator while the captured image uploads.
 */
export function UploadProgressView({ progress }: UploadProgressViewProps): React.JSX.Element {
  return (
    <SafeAreaView style={[styles.container, styles.centered]}>
      <ActivityIndicator size="large" color={colors.teal} />
      <Text style={styles.uploadingTitle}>Uploading image…</Text>
      <Text style={styles.uploadingProgress}>{progress}%</Text>
      <Text style={styles.uploadingSubtitle}>AI analysis will begin automatically</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  centered: { justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  uploadingTitle: { ...typography.titleLg, color: colors.white },
  uploadingProgress: { ...typography.jumbo, color: colors.tealAlt },
  uploadingSubtitle: { ...typography.body, color: colors.gray500 },
});
