import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

/**
 * @description Initials shown on the profile avatar, e.g. "Jane Doe" -> "JD".
 * @param username - Signed-in user's display name, if known.
 */
function getInitials(username: string | null): string {
  if (!username) return '?';
  const parts = username.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface ProfileHeaderProps {
  username: string | null;
  roleLabel: string;
}

/**
 * @description Avatar, username, and role badge shown at the top of the Profile tab.
 * @param username - Signed-in user's display name, if known.
 * @param roleLabel - Human-readable role name.
 */
export function ProfileHeader({ username, roleLabel }: ProfileHeaderProps): React.JSX.Element {
  return (
    <View style={styles.header}>
      <View style={styles.avatar}>
        <Text style={styles.avatarInitials}>{getInitials(username)}</Text>
      </View>
      <Text style={styles.username}>{username ?? '—'}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleBadgeText}>{roleLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  avatarInitials: {
    ...typography.hero,
    color: colors.white,
    letterSpacing: 1,
  },
  username: {
    ...typography.heading,
    fontWeight: fontWeight.bold,
    color: colors.gray900,
  },
  roleBadge: {
    paddingHorizontal: spacing.mlg,
    paddingVertical: spacing.xs,
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(46,125,122,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(46,125,122,0.3)',
  },
  roleBadgeText: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.teal,
  },
});
