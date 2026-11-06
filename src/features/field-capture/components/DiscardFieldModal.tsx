import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { FIELD_CAPTURE_TEXT } from '../constants/fieldCaptureText.constant';

export interface DiscardFieldModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * @description Themed confirmation shown before a captured field is discarded,
 * replacing the native Alert.alert so this destructive step reads as part of the
 * app rather than an OS dialog (mirrors UploadRetryModal/SubmitResultModal).
 * @param visible - Whether the modal is shown.
 * @param onConfirm - Discards the field.
 * @param onCancel - Dismisses the modal, keeping the field.
 */
export function DiscardFieldModal({
  visible,
  onConfirm,
  onCancel,
}: DiscardFieldModalProps): React.JSX.Element {
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
            <Icon name="trash-outline" size={30} color={colors.red600} />
          </View>

          <Text style={styles.title}>{FIELD_CAPTURE_TEXT.discardModalTitle}</Text>
          <Text style={styles.body}>{FIELD_CAPTURE_TEXT.discardModalBody}</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.keepButton]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={FIELD_CAPTURE_TEXT.keepFieldLabel}
              testID="discard-field-modal-keep-button"
            >
              <Text style={styles.keepButtonText}>{FIELD_CAPTURE_TEXT.keepFieldLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.discardButton]}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={FIELD_CAPTURE_TEXT.confirmDiscardLabel}
              testID="discard-field-modal-confirm-button"
            >
              <Text style={styles.discardButtonText}>{FIELD_CAPTURE_TEXT.confirmDiscardLabel}</Text>
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
  keepButton: { backgroundColor: colors.gray50, borderWidth: 0.5, borderColor: colors.gray300 },
  discardButton: { backgroundColor: colors.red600 },
  keepButtonText: {
    ...typography.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.gray700,
  },
  discardButtonText: {
    ...typography.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
