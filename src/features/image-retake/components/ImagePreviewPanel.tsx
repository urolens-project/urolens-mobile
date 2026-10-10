import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ProcessedImage } from '@lib/camera/imageUtils';
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { DiscardConfirmationModal } from './DiscardConfirmationModal';

export interface ImagePreviewPanelProps {
  processed: ProcessedImage;
  validationError: string | null;
  /** 1-based index of the slot this photo belongs to, for the header label. */
  slotNumber: number;
  targetCount: number;
  showDiscardModal: boolean;
  isDiscarding: boolean;
  onGoBack: () => void;
  onRetake: () => void;
  onKeep: () => void;
  onDiscardConfirm: () => void;
  onDiscardCancel: () => void;
}

/**
 * @description Full-screen preview of one just-captured/picked photo within a capture
 * session, with Retake and Keep Photo actions, plus the guarded discard-confirmation
 * modal shown the first time an existing uploaded batch is being replaced.
 */
export function ImagePreviewPanel({
  processed,
  validationError,
  slotNumber,
  targetCount,
  showDiscardModal,
  isDiscarding,
  onGoBack,
  onRetake,
  onKeep,
  onDiscardConfirm,
  onDiscardCancel,
}: ImagePreviewPanelProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.previewHeader}>
        <View style={styles.previewHeaderRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onGoBack}
            accessibilityRole="button"
            accessibilityLabel="Leave capture"
          >
            <Icon name="close" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.previewTitle}>
            Photo {slotNumber} of {targetCount}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
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
          onPress={onKeep}
          testID="keep-photo-button"
        >
          <Icon name="checkmark-circle-outline" size={18} color={colors.white} />
          <Text style={styles.useLabel}>Keep Photo</Text>
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
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSpacer: { width: 40 },
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
