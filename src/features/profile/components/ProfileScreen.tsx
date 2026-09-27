import { StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@lib/auth/authStore';
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { useAuth } from '@features/auth/hooks/useAuth';

import { ProfileAccountCard } from './ProfileAccountCard';
import { ProfileHeader } from './ProfileHeader';
import { ProfileSyncCard } from './ProfileSyncCard';

const ROLE_LABELS: Record<string, string> = {
  MEDTECH: 'Medical Technologist',
  SUPERVISOR: 'Supervisor',
  RECEPTIONIST: 'Receptionist',
  PHYSICIAN: 'Physician',
  ADMINISTRATOR: 'Administrator',
};

/**
 * @description Profile tab: account details, last-sync status with a manual sync
 * trigger, and log out.
 */
export function ProfileScreen(): React.JSX.Element {
  const { logout } = useAuth();
  const { username, role, userId } = useAuthStore();

  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : '—';
  const shortId = userId ? `${userId.slice(0, 8)}…` : '—';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader username={username} roleLabel={roleLabel} />
        <ProfileAccountCard username={username} roleLabel={roleLabel} shortId={shortId} />
        <ProfileSyncCard />

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={logout}
          accessibilityLabel="Log out"
          accessibilityRole="button"
        >
          <Icon name="log-out-outline" size={20} color={colors.red600} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.jumbo,
    gap: spacing.lg,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.mlg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.red300,
    backgroundColor: colors.red50,
    marginTop: spacing.xs,
  },
  logoutText: {
    ...typography.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.red600,
  },
});
