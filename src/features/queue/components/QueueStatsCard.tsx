import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AnimatedCount } from '@components/AnimatedCount';
import { QUEUE_STATUS_STYLES } from '../constants';
import type { QueueStatus } from '../status';

interface Props {
  counts: { assigned: number; inProgress: number; returned: number };
  // e.g. "5m ago" — shown as "Last Sync: 5m ago".
  lastSync: string;
  reduceMotion: boolean;
}

const TILES: { status: QueueStatus; label: string; key: keyof Props['counts'] }[] = [
  { status: 'ASSIGNED', label: 'Assigned', key: 'assigned' },
  { status: 'PROCESSING', label: 'In Progress', key: 'inProgress' },
  { status: 'RETURNED', label: 'Returned', key: 'returned' },
];

// Where the Queue stands at a glance. Three tiles, one per status, in the status
// colors used everywhere else; the numbers count to their new value when the queue
// changes rather than jumping.
export function QueueStatsCard({ counts, lastSync, reduceMotion }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.tiles}>
        {TILES.map(({ status, label, key }) => {
          const style = QUEUE_STATUS_STYLES[status];
          return (
            <View key={status} style={[styles.tile, { backgroundColor: style.wash }]}>
              <View style={[styles.chip, { backgroundColor: style.tint }]}>
                <MaterialCommunityIcons name={style.icon} size={16} color={style.color} />
              </View>
              <AnimatedCount
                value={counts[key]}
                reduceMotion={reduceMotion}
                style={[styles.value, { color: style.color }]}
              />
              <Text style={styles.label}>{label}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.syncRow}>
        <Ionicons name="time-outline" size={13} color="#9CA3AF" />
        <Text style={styles.syncText}>Last Sync: {lastSync}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 14,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  tiles: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 18,
  },
  chip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  syncText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
