import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { REPORT_CATEGORY_STYLES } from '../constants';
import type { ReportItem } from '../types';

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

// A finished sample. Colored by the category it sits in (badge, accent edge,
// rejection chip), so it reads as part of the container it was opened from.
function ReportItemCardComponent({ item, onPress }: Props) {
  const style = REPORT_CATEGORY_STYLES[item.category];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item.id)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Sample ${item.sampleUid}, patient ${item.patientUid}`}
    >
      <View style={[styles.accent, { backgroundColor: style.color }]} />

      <View style={[styles.dropletBadge, { backgroundColor: style.tint }]}>
        <Ionicons name="water" size={20} color={style.color} />
      </View>

      <View style={styles.content}>
        <Text style={styles.patientUid} numberOfLines={1}>
          {item.patientUid}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.sampleUid} · {item.testType ?? '—'}
        </Text>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={12} color="#9CA3AF" />
          <Text style={styles.time}>{formatDate(item.finalizedAt)}</Text>
        </View>
        {item.category === 'REJECTED' && item.rejectionReason && (
          <View style={[styles.reasonChip, { backgroundColor: style.tint }]}>
            <Text style={[styles.reasonText, { color: style.color }]} numberOfLines={1}>
              {item.rejectionReason.replace(/_/g, ' ')}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.arrowBadge, { backgroundColor: style.wash }]}>
        <Ionicons name="chevron-forward" size={16} color={style.color} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingLeft: 18,
    paddingRight: 14,
    paddingVertical: 16,
    gap: 12,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  },
  // Slim colored edge on the left, inset from the corners.
  accent: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 4,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  dropletBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  patientUid: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  reasonChip: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  reasonText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  arrowBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const ReportItemCard = React.memo(ReportItemCardComponent);
