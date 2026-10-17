import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { AUTH_TEXT } from '../../constants/authText.constant';

export interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * @description Explains that password resets are admin-mediated rather than
 * self-service, matching how a locked or inactive account is already handled.
 * Shown when the medtech taps "Forgot password?" on the login screen.
 * @param visible - Whether the modal is shown.
 * @param onClose - Called when the medtech dismisses the modal.
 */
export function ForgotPasswordModal({
  visible,
  onClose,
}: ForgotPasswordModalProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.iconContainer}>
            <Icon name="help-circle-outline" size={26} color={colors.blue800} />
          </View>

          <Text style={styles.title}>{AUTH_TEXT.forgotPasswordModalTitle}</Text>
          {/*
            TODO(API): copy is generic because the lab administrator's contact details
            (email/phone) aren't available to the app yet. If the backend exposes a
            per-lab support contact (e.g. GET /auth/support-contact), surface it here
            instead of this static text.
          */}
          <Text style={styles.body}>{AUTH_TEXT.forgotPasswordModalBody}</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={AUTH_TEXT.forgotPasswordModalCloseAccessibilityLabel}
          >
            <Text style={styles.buttonText}>{AUTH_TEXT.forgotPasswordModalButtonText}</Text>
          </TouchableOpacity>
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.blue50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  button: {
    width: '100%',
    paddingVertical: spacing.mlg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    backgroundColor: colors.teal,
  },
  buttonText: {
    ...typography.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
