import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { FIELD_CAPTURE_TEXT } from '../constants/fieldCaptureText.constant';

export interface UploadRetryModalProps {
  visible: boolean;
  message: string;
  onTryAgain: () => void;
  onCancel: () => void;
}

/**
 * @description Shown when a field upload fails to reach the server at all (offline,
 * unreachable, timed out) — offers Try Again without losing the captured image, or
 * Cancel to stay on the preview and decide later (field-post-analysis-report.md,
 * Section 2 item 7).
 * @param visible - Whether the modal is shown.
 * @param message - The network failure's message.
 * @param onTryAgain - Re-attempts the same upload.
 * @param onCancel - Dismisses the modal, keeping the captured image on the preview screen.
 */
export function UploadRetryModal({
  visible,
  message,
  onTryAgain,
  onCancel,
}: UploadRetryModalProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.iconContainer}>
            <Icon name="cloud-offline-outline" size={30} color={colors.red600} />
          </View>

          <Text style={styles.title}>{FIELD_CAPTURE_TEXT.uploadRetryModalTitle}</Text>
          <Text style={styles.body}>{message}</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={FIELD_CAPTURE_TEXT.uploadRetryModalCancelLabel}
              testID="upload-retry-cancel-button"
            >
              <Text style={styles.cancelButtonText}>
                {FIELD_CAPTURE_TEXT.uploadRetryModalCancelLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.tryAgainButton]}
              onPress={onTryAgain}
              accessibilityRole="button"
              accessibilityLabel={FIELD_CAPTURE_TEXT.uploadRetryModalTryAgainLabel}
              testID="upload-retry-try-again-button"
            >
              <Text style={styles.tryAgainButtonText}>
                {FIELD_CAPTURE_TEXT.uploadRetryModalTryAgainLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: radius.lg,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    backgroundColor: colors.red50,
  },
  title: {
    ...typography.titleLg,
    fontWeight: fontWeight.bold,
    color: colors.gray900,
    textAlign: 'center',
    marginBottom: spacing.smd,
  },
  body: {
    ...typography.bodyLg,
    color: colors.gray500,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  actions: { flexDirection: 'row', gap: spacing.smd, width: '100%' },
  button: {
    flex: 1,
    paddingVertical: spacing.mlg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: { backgroundColor: colors.gray50, borderWidth: 0.5, borderColor: colors.gray300 },
  tryAgainButton: { backgroundColor: colors.red600 },
  cancelButtonText: {
    ...typography.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.gray700,
  },
  tryAgainButtonText: {
    ...typography.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
