import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { QueueItem } from '../features/queue/types';

interface Props {
  item: QueueItem;
  onPress: (id: string) => void;
}

type BadgeVariant = 'URGENT' | 'IN_QUEUE' | 'ANALYZING';

interface BadgeConfig {
  label: string;
  bg: string;
  text: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  barColor: string;
}

const BADGE: Record<BadgeVariant, BadgeConfig> = {
  URGENT:    { label: 'URGENT',    bg: '#FEE2E2', text: '#DC2626', icon: 'alert',             barColor: '#DC2626' },
  ANALYZING: { label: 'ANALYZING', bg: '#EDE9FE', text: '#7C3AED', icon: 'analytics-outline', barColor: '#7C3AED' },
  IN_QUEUE:  { label: 'IN QUEUE',  bg: '#E0F2F1', text: '#2E7D7A', icon: 'reorder-three',     barColor: '#2E7D7A' },
};

function getBadgeVariant(item: QueueItem): BadgeVariant {
  if (item.priorityLevel === 'HIGH') return 'URGENT';
  if (item.status === 'PROCESSING' || item.status === 'IN_PROGRESS') return 'ANALYZING';
  return 'IN_QUEUE';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function QueueItemCard({ item, onPress }: Props) {
  const variant = getBadgeVariant(item);
  const badge = BADGE[variant];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item.id)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Sample ${item.sampleUid}, ${item.patientName}`}
    >
      <View style={[styles.bar, { backgroundColor: badge.barColor }]} />

      <View style={styles.content}>
        <View style={styles.left}>
          <Text style={styles.name}>{item.patientName}</Text>
          <Text style={styles.uid}>ID: #{item.sampleUid}</Text>
        </View>

        <View style={styles.right}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={11} color={badge.text} />
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={12} color="#9CA3AF" />
            <Text style={styles.timeText}>{formatTime(item.receivedAt)}</Text>
          </View>
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
  bar: {
    width: 5,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  left: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 3,
  },
  uid: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
