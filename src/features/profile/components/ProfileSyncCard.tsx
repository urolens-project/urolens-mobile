import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getIsSyncing, synchronize } from '@db/sync/syncManager';
import { useAsyncAction } from '@hooks/useAsyncAction';
import { formatShortDateTime } from '@lib/dateTime';
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { InfoRow } from './InfoRow';
import { InfoRowSeparator } from './InfoRowSeparator';

const LAST_SYNC_KEY = 'urolens_last_sync_at';

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

/**
 * @description "Data" card: last-sync status, a manual sync trigger, and app version.
 * Owns its own last-sync state — nothing about sync is needed outside this card.
 */
export function ProfileSyncCard(): React.JSX.Element {
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

  return (
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
      <InfoRowSeparator />
      <InfoRow icon="phone-portrait-outline" label="App Version" value="1.0.0" />
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
  syncRow: {
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
});
