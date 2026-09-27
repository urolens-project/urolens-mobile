import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import type { RejectionReasonOption } from '../constants/rejectionReason.constant';

export interface RejectionReasonCardProps {
  reason: RejectionReasonOption;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * @description One selectable rejection-reason row: a radio indicator, label, and
 * description.
 * @param reason - The reason this card represents.
 * @param isSelected - Whether this is the currently selected reason.
 * @param onSelect - Called when the card is tapped.
 */
export function RejectionReasonCard({
  reason,
  isSelected,
  onSelect,
}: RejectionReasonCardProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.reasonCard, isSelected && styles.reasonCardSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
    >
      <View style={styles.reasonCardInner}>
        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
          {isSelected && <View style={styles.radioInner} />}
        </View>
        <View style={styles.reasonText}>
          <Text style={[styles.reasonLabel, isSelected && styles.reasonLabelSelected]}>
            {reason.label}
          </Text>
          <Text style={styles.reasonDesc}>{reason.description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  reasonCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    padding: spacing.mlg,
  },
  reasonCardSelected: {
    borderColor: colors.teal,
    backgroundColor: colors.tealTint4,
  },
  reasonCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10, // Half of width/height above — computed circle radius.
    borderWidth: 2,
    borderColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1, // TODO(theme): below spacing.xxs(2); left exact.
    flexShrink: 0,
  },
  radioOuterSelected: {
    borderColor: colors.teal,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5, // Half of width/height above — computed circle radius.
    backgroundColor: colors.teal,
  },
  reasonText: {
    flex: 1,
    gap: 2, // TODO(theme): below spacing.xxs(2)... exact (already the smallest step, left explicit).
  },
  reasonLabel: {
    ...typography.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.gray800,
  },
  reasonLabelSelected: {
    color: colors.teal,
  },
  reasonDesc: {
    ...typography.body,
    color: colors.gray500,
    lineHeight: 18,
  },
});
