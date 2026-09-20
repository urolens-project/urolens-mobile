import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReportItem } from '../types';

const TEAL = '#2E7D7A';
const TEAL_TINT = '#E0F2F1';

interface Props {
  item: ReportItem;
  onPress: (id: string) => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

// Same layout as the Queue's sample cards (QueueItemCard) — droplet mark,
// shadow, date-then-arrow trailing edge — so a sample reads the same
// whether it's still active or already filed away in Reports.
function ReportItemCardComponent({ item, onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item.id)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Sample ${item.sampleUid}, patient ${item.patientUid}`}
    >
      <View style={styles.dropletBadge}>
        <Ionicons name="water" size={18} color={TEAL} />
      </View>

      <View style={styles.content}>
        <Text style={styles.patientUid} numberOfLines={1}>
          {item.patientUid}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.sampleUid} · {item.testType ?? '—'}
        </Text>
        {item.category === 'REJECTED' && item.rejectionReason && (
          <Text style={styles.rejectionReason} numberOfLines={1}>
            {item.rejectionReason.replace(/_/g, ' ')}
          </Text>
        )}
      </View>

      <Text style={styles.time}>{formatDate(item.finalizedAt)}</Text>
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
    paddingVertical: 24,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
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
    gap: 4,
  },
  patientUid: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  time: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  rejectionReason: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
  },
  arrowBadge: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const ReportItemCard = React.memo(ReportItemCardComponent);
