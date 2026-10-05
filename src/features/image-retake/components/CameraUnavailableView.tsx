import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

export interface CameraUnavailableViewProps {
  message: string;
  validationError: string | null;
  onGalleryPick: () => void;
  onGoBack: () => void;
}

/**
 * @description Shown when the camera hardware failed to initialize — still lets the
 * medtech proceed by picking an image from the gallery.
 */
export function CameraUnavailableView({
  message,
  validationError,
  onGalleryPick,
  onGoBack,
}: CameraUnavailableViewProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onGoBack}
        accessibilityRole="button"
        accessibilityLabel="Leave capture"
      >
        <Icon name="close" size={24} color={colors.white} />
      </TouchableOpacity>
      <View style={styles.permissionBox}>
        <Text style={styles.permissionTitle}>Camera Unavailable</Text>
        <Text style={styles.permissionBody}>{message}</Text>
        {validationError && (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <Icon name="alert-circle-outline" size={16} color={colors.red700} />
            <Text style={styles.errorText}>{validationError}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.secondaryButton} onPress={onGalleryPick}>
          <Text style={styles.secondaryLabel}>Upload from Gallery Instead</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.lg,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  permissionTitle: {
    ...typography.heading,
    fontWeight: fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
  },
  permissionBody: { ...typography.bodyLg, color: colors.gray400, textAlign: 'center', lineHeight: 20 },
  secondaryButton: { paddingVertical: spacing.smd },
  secondaryLabel: { ...typography.bodyLg, color: colors.tealAlt },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.red100,
    borderRadius: radius.sm,
    padding: spacing.smd,
    width: '100%',
  },
  errorText: { ...typography.body, color: colors.red700, lineHeight: 18, flex: 1 },
});
