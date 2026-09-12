import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReportCategory, ReportItem } from '../types';

interface Props {
  item: ReportItem;
  onPress: (id: string) => void;
}

interface CategoryStyle {
  barColor: string;
  bg: string;
  text: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

// Same palette family as sample/[id].tsx's read-only status banners, so a
// report card reads consistently with the detail screen it opens into.
const CATEGORY_STYLES: Record<ReportCategory, CategoryStyle> = {
  PENDING_APPROVAL: { barColor: '#2563EB', bg: '#EFF6FF', text: '#1E40AF', icon: 'time-outline' },
  APPROVED: {
    barColor: '#059669',
    bg: '#ECFDF5',
    text: '#065F46',
    icon: 'checkmark-circle-outline',
  },
  RELEASED: { barColor: '#059669', bg: '#F0FDF4', text: '#065F46', icon: 'send-outline' },
  REJECTED: { barColor: '#DC2626', bg: '#FEF2F2', text: '#B91C1C', icon: 'close-circle-outline' },
};

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

function ReportItemCardComponent({ item, onPress }: Props) {
  const style = CATEGORY_STYLES[item.category];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item.id)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Sample ${item.sampleUid}, patient ${item.patientUid}`}
    >
      <View style={[styles.bar, { backgroundColor: style.barColor }]} />

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.patientUid} numberOfLines={1}>
            {item.patientUid}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
        </View>

        <View style={styles.row}>
          <Text style={styles.uid}>{item.sampleUid}</Text>
          <Text style={styles.time}>{formatDate(item.finalizedAt)}</Text>
        </View>

        <View style={[styles.row, styles.bottomRow]}>
          <Text style={styles.testType}>{item.testType ?? '—'}</Text>
          {item.category === 'REJECTED' && item.rejectionReason && (
            <Text style={styles.rejectionReason} numberOfLines={1}>
              {item.rejectionReason.replace(/_/g, ' ')}
            </Text>
          )}
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
  patientUid: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontVariant: ['tabular-nums'],
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
  testType: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  rejectionReason: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
});

export const ReportItemCard = React.memo(ReportItemCardComponent);
