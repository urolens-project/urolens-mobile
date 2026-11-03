import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

type SubmitResultVariant = 'success' | 'error';

interface VariantStyle {
  icon: 'checkmark-circle' | 'close-circle';
  iconColor: string;
  iconBg: string;
  buttonBg: string;
}

const VARIANT_STYLES: Record<SubmitResultVariant, VariantStyle> = {
  success: {
    icon: 'checkmark-circle',
    iconColor: colors.emerald600,
    iconBg: colors.tealTint,
    buttonBg: colors.teal,
  },
  error: {
    icon: 'close-circle',
    iconColor: colors.red600,
    iconBg: colors.red50,
    buttonBg: colors.red600,
  },
};

export interface SubmitResultModalProps {
  visible: boolean;
  variant: SubmitResultVariant;
  title: string;
  message: string;
  onDismiss: () => void;
}

/**
 * @description Themed replacement for the native Alert.alert shown after a Submit for
 * Verification attempt, so both the success and failure outcomes read as part of the
 * app rather than an OS dialog.
 * @param visible - Whether the modal is shown.
 * @param variant - 'success' for a completed submission, 'error' for a failed one — drives
 * the icon and accent color.
 * @param title - Headline text.
 * @param message - Supporting body text.
 * @param onDismiss - Called when the medtech taps the confirm button.
 */
export function SubmitResultModal({
  visible,
  variant,
  title,
  message,
  onDismiss,
}: SubmitResultModalProps): React.JSX.Element {
  const v = VARIANT_STYLES[variant];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={[styles.iconContainer, { backgroundColor: v.iconBg }]}>
            <Icon name={v.icon} size={30} color={v.iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{message}</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: v.buttonBg }]}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={title}
          >
            <Text style={styles.buttonText}>OK</Text>
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
    width: 64,
    height: 64,
    borderRadius: 32,
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
  },
  buttonText: {
    ...typography.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
