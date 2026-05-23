import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { QueueItem } from '../features/queue/types';

interface Props {
  item: QueueItem;
  onPress: (id: string) => void;
  selected?: boolean;
}

interface BadgeConfig {
  label: string;
  bg: string;
  text: string;
  barColor: string;
}

function getBadge(item: QueueItem): BadgeConfig {
  if (item.priorityLevel === 'HIGH') {
    return { label: 'STAT / HIGH PRIORITY', bg: '#FEE2E2', text: '#DC2626', barColor: '#DC2626' };
  }
  if (item.priorityLevel === 'NORMAL') {
    return { label: 'NORMAL', bg: '#DBEAFE', text: '#2563EB', barColor: '#2563EB' };
  }
  if (item.priorityLevel === 'LOW') {
    return { label: 'LOW', bg: '#F3F4F6', text: '#6B7280', barColor: '#9CA3AF' };
  }
  if (item.status === 'PROCESSING') {
    return { label: 'IN PROGRESS', bg: '#EDE9FE', text: '#7C3AED', barColor: '#7C3AED' };
  }
  return { label: 'ROUTINE', bg: '#D1FAE5', text: '#059669', barColor: '#059669' };
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
  if (t.includes('urin'))   return 'water-outline';
  if (t.includes('blood'))  return 'pulse-outline';
  if (t.includes('semen') || t.includes('sperm')) return 'cellular-outline';
  if (t.includes('stool') || t.includes('fecal')) return 'flask-outline';
  return 'flask-outline';
}

export function QueueItemCard({ item, onPress, selected = false }: Props) {
  const badge = getBadge(item);

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Sample ${item.sampleUid}, ${item.patientName}`}
    >
      {/* Left priority bar */}
      <View style={[styles.bar, { backgroundColor: badge.barColor }]} />

      <View style={styles.content}>
        {/* Row 1 — name + badge */}
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{item.patientName}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Row 2 — sample UID + time */}
        <View style={styles.row}>
          <Text style={styles.uid}>{item.sampleUid}</Text>
          <Text style={styles.time}>{formatTime(item.receivedAt)}</Text>
        </View>

        {/* Row 3 — test type + menu */}
        <View style={[styles.row, styles.bottomRow]}>
          <View style={styles.testTypeRow}>
            <Ionicons name={getTestTypeIcon(item.testType)} size={14} color="#9CA3AF" />
            <Text style={styles.testType}>{item.testType ?? '—'}</Text>
          </View>
          <Ionicons name="reorder-three-outline" size={20} color="#D1D5DB" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardSelected: {
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: '#2E7D7A',
  },
  bar: {
    width: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomRow: {
    marginTop: 2,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  uid: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  time: {
    fontSize: 13,
    color: '#6B7280',
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
  testTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  testType: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
