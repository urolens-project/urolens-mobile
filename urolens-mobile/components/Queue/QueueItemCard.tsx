// src/features/queue/components/QueueItemCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { QueueItem, PriorityLevel } from './types';

interface Props {
  item: QueueItem;
  onPress: (id: string) => void;
}

const PRIORITY_COLORS: Record<PriorityLevel, { bg: string; text: string; label: string }> = {
  HIGH: { bg: '#FCEBEB', text: '#A32D2D', label: 'High' },
  NORMAL: { bg: '#EAF3DE', text: '#3B6D11', label: 'Normal' },
  LOW: { bg: '#F1EFE8', text: '#5F5E5A', label: 'Low' },
};

function formatReceivedAt(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function QueueItemCard({ item, onPress }: Props) {
  const priority = item.priorityLevel ?? 'NORMAL';
  const priorityStyle = PRIORITY_COLORS[priority];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item.id)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Sample ${item.sampleUid}, ${item.patientName}, ${priorityStyle.label} priority`}
    >
      <View style={styles.topRow}>
        <Text style={styles.sampleUid}>{item.sampleUid}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
          <Text style={[styles.priorityText, { color: priorityStyle.text }]}>
            {priorityStyle.label}
          </Text>
        </View>
      </View>

      <Text style={styles.patientName} numberOfLines={1}>
        {item.patientName}
      </Text>

      <View style={styles.bottomRow}>
        <Text style={styles.testType}>{item.testType}</Text>
        <Text style={styles.receivedAt}>{formatReceivedAt(item.receivedAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.12)',
    padding: 14,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sampleUid: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#888780',
    letterSpacing: 0.5,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '500',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testType: {
    fontSize: 13,
    color: '#5F5E5A',
  },
  receivedAt: {
    fontSize: 12,
    color: '#888780',
  },
});