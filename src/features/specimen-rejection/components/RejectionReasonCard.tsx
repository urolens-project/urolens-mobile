import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import type { RejectionReasonOption } from '../constants/rejectionReason.constant';

export interface RejectionReasonCardProps {
  reason: RejectionReasonOption;
  isSelected: boolean;
  onSelect: () => void;
  isDisabled?: boolean;
}

/**
 * @description One selectable rejection-reason row: a radio indicator, label, and
 * description.
 * @param reason - The reason this card represents.
 * @param isSelected - Whether this is the currently selected reason.
 * @param onSelect - Called when the card is tapped.
 * @param isDisabled - Prevents changing the reason while saving.
 */
export function RejectionReasonCard({
  reason,
  isSelected,
  onSelect,
  isDisabled = false,
}: RejectionReasonCardProps): React.JSX.Element {
  const handleSelect = (): void => {
    if (!isDisabled) onSelect();
  };

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.containerSelected]}
      onPress={handleSelect}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityLabel={reason.label}
      accessibilityState={{ checked: isSelected, disabled: isDisabled }}
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
  container: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    padding: spacing.mlg,
  },
  containerSelected: {
    borderColor: colors.teal,
    backgroundColor: colors.tealTint4,
  },
  reasonCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  radioOuter: {
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxs,
    flexShrink: 0,
  },
  radioOuterSelected: {
    borderColor: colors.teal,
  },
  radioInner: {
    width: spacing.smd,
    height: spacing.smd,
    borderRadius: radius.pill,
    backgroundColor: colors.teal,
  },
  reasonText: {
    flex: 1,
    gap: spacing.xxs,
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
    lineHeight: spacing.xl,
  },
});
