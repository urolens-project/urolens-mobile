import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fontWeight, spacing, typography } from '@src/theme';

export interface CameraUnavailableViewProps {
  message: string;
  onGalleryPick: () => void;
}

/**
 * @description Shown when the camera hardware failed to initialize — still lets the
 * medtech proceed by picking an image from the gallery.
 */
export function CameraUnavailableView({
  message,
  onGalleryPick,
}: CameraUnavailableViewProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.permissionBox}>
        <Text style={styles.permissionTitle}>Camera Unavailable</Text>
        <Text style={styles.permissionBody}>{message}</Text>
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
  secondaryButton: { paddingVertical: spacing.smd },
  secondaryLabel: { ...typography.bodyLg, color: colors.tealAlt },
});
