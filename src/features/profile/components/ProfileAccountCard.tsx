import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { PROFILE_TEXT } from '../constants/profileText.constant';
import { InfoRow } from './InfoRow';
import { InfoRowSeparator } from './InfoRowSeparator';

export interface ProfileAccountCardProps {
  username: string | null;
  roleLabel: string;
  shortId: string;
}

/**
 * @description "Account" card: username, role, user id, and a static Active status.
 * @param username - Signed-in user's display name, if known.
 * @param roleLabel - Human-readable role name.
 * @param shortId - Truncated user id for display.
 */
export function ProfileAccountCard({
  username,
  roleLabel,
  shortId,
}: ProfileAccountCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{PROFILE_TEXT.accountCardTitle}</Text>
      <InfoRow icon="person-outline" label={PROFILE_TEXT.usernameLabel} value={username ?? '—'} />
      <InfoRowSeparator />
      <InfoRow icon="shield-checkmark-outline" label={PROFILE_TEXT.roleLabel} value={roleLabel} />
      <InfoRowSeparator />
      <InfoRow icon="key-outline" label={PROFILE_TEXT.userIdLabel} value={shortId} />
      <InfoRowSeparator />
      <InfoRow
        icon="checkmark-circle-outline"
        label={PROFILE_TEXT.statusLabel}
        value={PROFILE_TEXT.statusActive}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  cardTitle: {
    ...typography.micro,
    fontWeight: fontWeight.bold,
    color: colors.gray400,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingVertical: spacing.smd,
  },
});
