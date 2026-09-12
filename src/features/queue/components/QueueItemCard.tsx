import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { QueueItem } from '../types';

const TEAL = '#2E7D7A';
const TEAL_TINT = '#E0F2F1';

interface Props {
  item: QueueItem;
  onPress: (id: string) => void;
  selected?: boolean;
}

interface BadgeConfig {
  label: string;
  bg: string;
  text: string;
}

function getBadge(item: QueueItem): BadgeConfig {
  if (item.isReturnedForCorrection) {
    return { label: 'RETURNED FOR CORRECTION', bg: '#FFFBEB', text: '#92400E' };
  }
  if (item.priorityLevel === 'HIGH') {
    return { label: 'STAT / HIGH PRIORITY', bg: '#FEE2E2', text: '#DC2626' };
  }
  if (item.priorityLevel === 'NORMAL') {
    return { label: 'NORMAL', bg: '#DBEAFE', text: '#2563EB' };
  }
  if (item.priorityLevel === 'LOW') {
    return { label: 'LOW', bg: '#F3F4F6', text: '#6B7280' };
  }
  if (item.status === 'PROCESSING') {
    return { label: 'IN PROGRESS', bg: '#EDE9FE', text: '#7C3AED' };
  }
  return { label: 'ROUTINE', bg: '#D1FAE5', text: '#059669' };
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '—';
  }
}

function getTestTypeIcon(testType: string): React.ComponentProps<typeof Ionicons>['name'] {
  const t = testType?.toLowerCase() ?? '';
  if (t.includes('urin')) return 'water-outline';
  if (t.includes('blood')) return 'pulse-outline';
  if (t.includes('semen') || t.includes('sperm')) return 'cellular-outline';
  if (t.includes('stool') || t.includes('fecal')) return 'flask-outline';
  return 'flask-outline';
}

function QueueItemCardComponent({ item, onPress, selected = false }: Props) {
  const badge = getBadge(item);

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Sample ${item.sampleUid}, patient ${item.patientUid}`}
    >
      {/* Brand mark — every sample is a urine specimen, so a droplet stands
          in for the old priority-color bar instead of competing with it. */}
      <View style={styles.dropletBadge}>
        <Ionicons name="water" size={18} color={TEAL} />
      </View>

      <View style={styles.content}>
        {/* Shows patientUid, not patientName: intentional privacy decision
            so PHI isn't visible on a shared queue list. */}
        <View style={styles.row}>
          <Text style={styles.patientUid} numberOfLines={1}>
            {item.patientUid}
          </Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Ionicons name={getTestTypeIcon(item.testType)} size={13} color="#9CA3AF" />
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.sampleUid} · {item.testType ?? '—'}
          </Text>
        </View>
      </View>

      <Text style={styles.time}>{formatTime(item.receivedAt)}</Text>
      <View style={styles.arrowBadge}>
        <Ionicons name="chevron-forward" size={22} color={TEAL} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardSelected: {
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: TEAL,
  },
  dropletBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TEAL_TINT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientUid: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontVariant: ['tabular-nums'],
    marginRight: 8,
  },
  subtitle: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  time: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  arrowBadge: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const QueueItemCard = React.memo(QueueItemCardComponent);
