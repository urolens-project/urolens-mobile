import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

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
      <Text style={styles.cardTitle}>Account</Text>
      <InfoRow icon="person-outline" label="Username" value={username ?? '—'} />
      <InfoRowSeparator />
      <InfoRow icon="shield-checkmark-outline" label="Role" value={roleLabel} />
      <InfoRowSeparator />
      <InfoRow icon="key-outline" label="User ID" value={shortId} />
      <InfoRowSeparator />
      <InfoRow icon="checkmark-circle-outline" label="Status" value="Active" />
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
