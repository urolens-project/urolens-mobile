import { useEffect, useState, useCallback } from 'react';
import type { ComponentProps } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore } from '@lib/auth/authStore';
import { synchronize, getIsSyncing } from '@db/sync/syncManager';
import { formatShortDateTime } from '@lib/dateTime';
import { useAsyncAction } from '@hooks/useAsyncAction';
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { useAuth } from '@features/auth/hooks/useAuth';

const LAST_SYNC_KEY = 'urolens_last_sync_at';

const ROLE_LABELS: Record<string, string> = {
  MEDTECH: 'Medical Technologist',
  SUPERVISOR: 'Supervisor',
  RECEPTIONIST: 'Receptionist',
  PHYSICIAN: 'Physician',
  ADMINISTRATOR: 'Administrator',
};

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

/**
 * @description Formats an ISO sync timestamp as a short relative label, e.g. "5m ago".
 * @param iso - ISO 8601 timestamp of the last successful sync, or null if never synced.
 */
function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return formatShortDateTime(iso);
}

interface InfoRowProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps): React.JSX.Element {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Icon name={icon} size={18} color={colors.teal} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

/**
 * @description Profile tab: account details, last-sync status with a manual sync
 * trigger, and log out.
 */
export default function ProfileScreen(): React.JSX.Element {
  const { logout } = useAuth();
  const { username, role, userId } = useAuthStore();
  const [lastSync, setLastSync] = useState<string | null>(null);

  const loadLastSync = useCallback(async (): Promise<void> => {
    const val = await AsyncStorage.getItem(LAST_SYNC_KEY);
    setLastSync(val);
  }, []);

  useEffect(() => {
    void loadLastSync();
  }, [loadLastSync]);

  const syncAction = useCallback(async (): Promise<void> => {
    if (getIsSyncing()) return;
    await synchronize();
    await loadLastSync();
  }, [loadLastSync]);
  const { run: handleSyncNow, isLoading: syncing } = useAsyncAction('Profile', syncAction);

  const initials = getInitials(username);
  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : '—';
  const shortId = userId ? `${userId.slice(0, 8)}…` : '—';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar / identity ───────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.username}>{username ?? '—'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>
        </View>

        {/* ── Account details ──────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <InfoRow icon="person-outline" label="Username" value={username ?? '—'} />
          <View style={styles.separator} />
          <InfoRow icon="shield-checkmark-outline" label="Role" value={roleLabel} />
          <View style={styles.separator} />
          <InfoRow icon="key-outline" label="User ID" value={shortId} />
          <View style={styles.separator} />
          <InfoRow icon="checkmark-circle-outline" label="Status" value="Active" />
        </View>

        {/* ── Data & sync ──────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data</Text>
          <View style={styles.syncRow}>
            <View style={styles.infoIconWrap}>
              <Icon name="sync-outline" size={18} color={colors.teal} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Last Synced</Text>
              <Text style={styles.infoValue}>{formatSyncTime(lastSync)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
              onPress={handleSyncNow}
              disabled={syncing}
              accessibilityLabel="Sync now"
              accessibilityRole="button"
            >
              {syncing ? (
                <ActivityIndicator size="small" color={colors.teal} />
              ) : (
                <Text style={styles.syncBtnText}>Sync now</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.separator} />
          <InfoRow icon="phone-portrait-outline" label="App Version" value="1.0.0" />
        </View>

        {/* ── Log out ──────────────────────────────────────────────────────── */}
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

  // ── Header ──
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

  // ── Cards ──
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

  // ── Info rows ──
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.mlg,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(46,125,122,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    gap: spacing.xxs,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.gray400,
    fontWeight: fontWeight.medium,
  },
  infoValue: {
    ...typography.bodyLg,
    color: colors.gray900,
    fontWeight: fontWeight.medium,
  },
  separator: {
    height: 0.5,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginLeft: spacing.jumbo,
  },

  // ── Sync row (with inline button) ──
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.mlg,
  },
  syncBtn: {
    paddingHorizontal: spacing.mlg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(46,125,122,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(46,125,122,0.25)',
    minWidth: 78,
    alignItems: 'center',
  },
  syncBtnDisabled: {
    opacity: 0.5,
  },
  syncBtnText: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.teal,
  },

  // ── Logout ──
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
