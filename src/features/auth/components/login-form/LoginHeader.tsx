import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { AUTH_TEXT } from '../../constants/authText.constant';

/**
 * @description Static logo/title block at the top of the login card.
 */
export function LoginHeader(): React.JSX.Element {
  return (
    <View style={styles.header}>
      <View style={styles.iconBox}>
        <Icon name="microscope" family="material-community" size={38} color={colors.white} />
      </View>
      <Text style={styles.appTitle}>{AUTH_TEXT.loginHeaderTitle}</Text>
      <Text style={styles.appSubtitle}>{AUTH_TEXT.loginHeaderSubtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: radius.xxl,
    backgroundColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.mlg,
  },
  appTitle: {
    ...typography.hero,
    fontWeight: fontWeight.extrabold,
    color: colors.teal,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  appSubtitle: {
    ...typography.body,
    color: colors.gray500,
    textAlign: 'center',
  },
});
