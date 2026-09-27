import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

export interface CameraPermissionRequestProps {
  onRequestPermission: () => void;
  onGalleryPick: () => void;
}

/**
 * @description Shown when camera permission hasn't been granted yet — lets the medtech
 * request it, or fall back to picking an image from the gallery.
 */
export function CameraPermissionRequest({
  onRequestPermission,
  onGalleryPick,
}: CameraPermissionRequestProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.permissionBox}>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionBody}>
          UroLens needs camera access to photograph specimens for AI analysis.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={onRequestPermission}>
          <Text style={styles.primaryLabel}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onGalleryPick}>
          <Text style={styles.secondaryLabel}>Upload from Gallery Instead</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
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
  primaryButton: {
    backgroundColor: colors.teal,
    paddingVertical: spacing.mlg,
    paddingHorizontal: spacing.xxxl,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  primaryLabel: { ...typography.subtitle, fontWeight: fontWeight.semibold, color: colors.white },
  secondaryButton: { paddingVertical: spacing.smd },
  secondaryLabel: { ...typography.bodyLg, color: colors.tealAlt },
});
