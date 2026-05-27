import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { useAuthStore } from '../../src/lib/auth/authStore';
import { synchronize, getIsSyncing } from '../../src/db/sync/syncManager';

const TEAL = '#2E7D7A';
const BG = '#F7F6F3';
const LAST_SYNC_KEY = 'urolens_last_sync_at';

const ROLE_LABELS: Record<string, string> = {
  MEDTECH:       'Medical Technologist',
  SUPERVISOR:    'Supervisor',
  RECEPTIONIST:  'Receptionist',
  PHYSICIAN:     'Physician',
  ADMINISTRATOR: 'Administrator',
};

function getInitials(username: string | null): string {
  if (!username) return '?';
  const parts = username.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon as any} size={18} color={TEAL} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { logout } = useAuth();
  const { username, role, userId } = useAuthStore();
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadLastSync = useCallback(async () => {
    const val = await AsyncStorage.getItem(LAST_SYNC_KEY);
    setLastSync(val);
  }, []);

  useEffect(() => {
    loadLastSync();
  }, [loadLastSync]);

  const handleSyncNow = async () => {
    if (syncing || getIsSyncing()) return;
    setSyncing(true);
    try {
      await synchronize();
      await loadLastSync();
    } catch {
      // sync errors are non-fatal here; the sync manager logs them
    } finally {
      setSyncing(false);
    }
  };

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
          <InfoRow icon="person-outline"    label="Username" value={username ?? '—'} />
          <View style={styles.separator} />
          <InfoRow icon="shield-checkmark-outline" label="Role"     value={roleLabel} />
          <View style={styles.separator} />
          <InfoRow icon="key-outline"       label="User ID"  value={shortId} />
          <View style={styles.separator} />
          <InfoRow icon="checkmark-circle-outline" label="Status" value="Active" />
        </View>

        {/* ── Data & sync ──────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data</Text>
          <View style={styles.syncRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="sync-outline" size={18} color={TEAL} />
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
              {syncing
                ? <ActivityIndicator size="small" color={TEAL} />
                : <Text style={styles.syncBtnText}>Sync now</Text>
              }
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
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 32,
    paddingBottom: 48,
    gap: 16,
  },

  // ── Header ──
  header: {
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(46,125,122,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(46,125,122,0.3)',
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEAL,
  },

  // ── Cards ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingVertical: 10,
  },

  // ── Info rows ──
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(46,125,122,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  separator: {
    height: 0.5,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginLeft: 46,
  },

  // ── Sync row (with inline button) ──
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  syncBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
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
    fontSize: 13,
    fontWeight: '600',
    color: TEAL,
  },

  // ── Logout ──
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    marginTop: 4,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
});
