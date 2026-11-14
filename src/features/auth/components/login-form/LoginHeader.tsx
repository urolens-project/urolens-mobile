import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@src/theme';

import { AUTH_TEXT } from '../../constants/authText.constant';

/**
 * @description Static logo/title block at the top of the login card.
 */
export function LoginHeader(): React.JSX.Element {
  return (
    <View style={styles.header}>
      <Image
        source={require('../../../../../assets/images/urolens-transparent.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.appSubtitle}>{AUTH_TEXT.loginHeaderSubtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: spacing.xs,
  },
  appSubtitle: {
    ...typography.body,
    color: colors.gray500,
    textAlign: 'center',
  },
});
