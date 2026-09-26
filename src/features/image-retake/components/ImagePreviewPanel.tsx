import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ProcessedImage } from '@lib/camera/imageUtils';
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { DiscardConfirmationModal } from './DiscardConfirmationModal';

export interface ImagePreviewPanelProps {
  processed: ProcessedImage;
  validationError: string | null;
  showDiscardModal: boolean;
  isDiscarding: boolean;
  onRetake: () => void;
  onUseImage: () => void;
  onDiscardConfirm: () => void;
  onDiscardCancel: () => void;
}

/**
 * @description Full-screen preview of the captured/picked image with Retake and
 * Use This Image actions, plus the guarded discard-confirmation modal for retakes.
 */
export function ImagePreviewPanel({
  processed,
  validationError,
  showDiscardModal,
  isDiscarding,
  onRetake,
  onUseImage,
  onDiscardConfirm,
  onDiscardCancel,
}: ImagePreviewPanelProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>Image Preview</Text>
        <Text style={styles.previewMeta}>
          {processed.width} × {processed.height}px · {(processed.sizeBytes / 1024).toFixed(0)} KB
        </Text>
      </View>

      <View style={styles.previewContainer}>
        <Image source={{ uri: processed.uri }} style={styles.previewImage} resizeMode="contain" />
      </View>

      {validationError && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle-outline" size={14} color={colors.red700} />
          <Text style={styles.errorText}>{validationError}</Text>
        </View>
      )}

      <View style={styles.previewActions}>
        <TouchableOpacity
          style={[styles.previewBtn, styles.retakeBtn]}
          onPress={onRetake}
          testID="retake-button"
        >
          <Icon name="camera-reverse-outline" size={18} color={colors.gray300} />
          <Text style={styles.retakeLabel}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.previewBtn, styles.useBtn]}
          onPress={onUseImage}
          testID="use-image-button"
        >
          <Icon name="checkmark-circle-outline" size={18} color={colors.white} />
          <Text style={styles.useLabel}>Use This Image</Text>
        </TouchableOpacity>
      </View>

      <DiscardConfirmationModal
        visible={showDiscardModal}
        isLoading={isDiscarding}
        onConfirm={onDiscardConfirm}
        onCancel={onDiscardCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  previewHeader: {
    backgroundColor: colors.blackAlt,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mlg,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  previewTitle: {
    ...typography.title,
    color: colors.white,
  },
  previewMeta: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: spacing.xs,
  },
  previewContainer: { flex: 1, backgroundColor: colors.blackAlt },
  previewImage: { flex: 1 },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.smd,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    backgroundColor: colors.blackAlt,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  retakeBtn: {
    backgroundColor: colors.navyAlt,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  useBtn: { backgroundColor: colors.teal },
  retakeLabel: { ...typography.subtitle, fontWeight: fontWeight.semibold, color: colors.gray300 },
  useLabel: { ...typography.subtitle, fontWeight: fontWeight.semibold, color: colors.white },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.red100,
    marginHorizontal: spacing.lg,
    borderRadius: radius.sm,
    padding: spacing.smd,
    marginBottom: spacing.sm,
  },
  errorText: { ...typography.body, color: colors.red700, lineHeight: 18, flex: 1 },
});
