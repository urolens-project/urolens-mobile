import { StyleSheet, Text, View } from 'react-native';

import { appInfo } from '@lib/appInfo';
import { colors, spacing, typography } from '@src/theme';

import { AUTH_TEXT } from '../../constants/authText.constant';

/**
 * @description Build/version info shown below the login card.
 */
export function LoginFooter(): React.JSX.Element {
  return (
    <View style={styles.footer}>
      <Text style={styles.authorizedNotice}>{AUTH_TEXT.loginFooterAuthorizedNotice}</Text>
      <Text style={styles.buildText}>v{appInfo.version}</Text>
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
  buildText: {
    ...typography.caption,
    color: colors.gray500,
  },
  copyright: {
    ...typography.micro,
    color: colors.gray400,
    textAlign: 'center',
  },
});
