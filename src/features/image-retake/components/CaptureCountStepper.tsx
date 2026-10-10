// src/features/image-retake/components/CaptureCountStepper.tsx
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

export interface CaptureCountStepperProps {
  targetCount: number;
  canDecrease: boolean;
  canIncrease: boolean;
  onAdjust: (delta: number) => void;
}

/**
 * @description Compact -/+ control for the live capture-session target count (10-30).
 * Embedded directly in the camera HUD and the review grid instead of a separate
 * "how many photos?" screen — the MedTech can change their mind mid-session.
 * @param targetCount - Current session target.
 * @param canDecrease - Whether the target can still drop a step (floor: shots
 * already kept, then MIN_BATCH_IMAGES).
 * @param canIncrease - Whether the target can still rise a step (ceiling: MAX_BATCH_IMAGES).
 * @param onAdjust - Called with -1 or +1.
 */
export function CaptureCountStepper({
  targetCount,
  canDecrease,
  canIncrease,
  onAdjust,
}: CaptureCountStepperProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, !canDecrease && styles.buttonDisabled]}
        onPress={() => onAdjust(-1)}
        disabled={!canDecrease}
        accessibilityRole="button"
        accessibilityLabel="Decrease photo count"
      >
        <Icon name="remove" size={14} color={colors.white} />
      </TouchableOpacity>

      <Text style={styles.value} testID="capture-count-value">
        {targetCount}
      </Text>

      <TouchableOpacity
        style={[styles.button, !canIncrease && styles.buttonDisabled]}
        onPress={() => onAdjust(1)}
        disabled={!canIncrease}
        accessibilityRole="button"
        accessibilityLabel="Increase photo count"
      >
        <Icon name="add" size={14} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  button: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.35 },
  value: {
    ...typography.caption,
    color: colors.white,
    fontWeight: fontWeight.semibold,
    minWidth: 18,
    textAlign: 'center',
  },
});
