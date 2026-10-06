import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

export interface SessionExpiryWarningModalProps {
  visible: boolean;
  onStaySignedIn: () => void;
  /** Minutes until sign-out, from the session's idleWarningSeconds. */
  warningMinutes: number;
}

/**
 * @description Warns the medtech their session is about to expire from inactivity, using
 * the active session's own warning lead time. Any tap on "Stay Signed In" — or anywhere
 * else in the app, via the activity gate that owns this modal's visibility — cancels it.
 * @param visible - Whether the warning is shown.
 * @param onStaySignedIn - Called when the medtech confirms they're still there.
 * @param warningMinutes - Minutes until sign-out, shown in the message.
 */
export function SessionExpiryWarningModal({
  visible,
  onStaySignedIn,
  warningMinutes,
}: SessionExpiryWarningModalProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onStaySignedIn} // Android back button — dismissing counts as activity too
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.iconContainer}>
            <Icon name="time-outline" size={26} color={colors.amber800} />
          </View>

          <Text style={styles.title}>Session Expiring Soon</Text>
          <Text style={styles.body}>
            Your session will expire in {warningMinutes} minutes due to inactivity. Tap anywhere or
            press the button below to stay signed in.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={onStaySignedIn}
            accessibilityRole="button"
            accessibilityLabel="Stay signed in"
          >
            <Text style={styles.buttonText}>Stay Signed In</Text>
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
    backgroundColor: colors.amber100,
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
