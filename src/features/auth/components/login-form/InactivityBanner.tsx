import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

export interface InactivityBannerProps {
  onDismiss: () => void;
}

/**
 * @description Tells the medtech they were signed out automatically, rather than
 * silently landing back at an unexplained login screen. Shown when the login route is
 * reached with `?reason=inactivity`, e.g. after the foreground idle timeout or
 * reopening the app past the background timeout.
 * @param onDismiss - Called when the medtech dismisses the banner.
 */
export function InactivityBanner({ onDismiss }: InactivityBannerProps): React.JSX.Element {
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="time-outline" size={16} color={colors.amber800} style={styles.icon} />
      <Text style={styles.text}>
        You were signed out due to inactivity. Please sign in again to continue.
      </Text>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Icon name="close" size={16} color={colors.amber800} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.amber50,
    borderWidth: 1,
    borderColor: colors.amber200,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    flex: 1,
    ...typography.body,
    fontWeight: fontWeight.medium,
    color: colors.amber800,
    lineHeight: 18,
  },
});
