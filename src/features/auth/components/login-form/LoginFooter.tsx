import { StyleSheet, Text, View } from 'react-native';

import { appInfo } from '@lib/appInfo';
import { colors, fontWeight, spacing, radius, typography } from '@src/theme';

import { ENV_COLORS } from '../../constants/envColors.constant';
import { AUTH_TEXT } from '../../constants/authText.constant';

/**
 * @description Build/version and environment info shown below the login card.
 */
export function LoginFooter(): React.JSX.Element {
  const envColors = ENV_COLORS[appInfo.environment];

  return (
    <View style={styles.footer}>
      <Text style={styles.authorizedNotice}>{AUTH_TEXT.loginFooterAuthorizedNotice}</Text>
      <View style={styles.buildRow}>
        <Text style={styles.buildText}>v{appInfo.version}</Text>
        <View style={[styles.envPill, { backgroundColor: envColors.bg }]}>
          <Text style={[styles.envText, { color: envColors.fg }]}>{appInfo.environmentLabel}</Text>
        </View>
      </View>
      <Text style={styles.copyright}>{AUTH_TEXT.loginFooterCopyright}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
    gap: spacing.smd,
  },
  authorizedNotice: {
    ...typography.caption,
    color: colors.gray500,
    textAlign: 'center',
  },
  buildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buildText: {
    ...typography.caption,
    color: colors.gray500,
  },
  envPill: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  envText: {
    ...typography.micro,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },
  copyright: {
    ...typography.micro,
    color: colors.gray400,
    textAlign: 'center',
  },
});
