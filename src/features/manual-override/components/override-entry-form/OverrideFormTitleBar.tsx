import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { formatParticleName } from '@features/result-confirmation/lib/findingRows';

export interface OverrideFormTitleBarProps {
  parameter: string;
  onBack: () => void;
  isSubmitting: boolean;
}

/**
 * @description Fixed title bar: back button, screen title, and the parameter being overridden.
 * @param parameter - Machine name of the parameter (e.g. "RBC"), shown human-formatted.
 * @param onBack - Called when the back button is tapped.
 * @param isSubmitting - Prevents leaving while a correction is being saved.
 */
export function OverrideFormTitleBar({
  parameter,
  onBack,
  isSubmitting,
}: OverrideFormTitleBarProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onBack}
        disabled={isSubmitting}
        style={styles.backButton}
        accessibilityLabel="Go back to Analysis Result"
        accessibilityRole="button"
      >
        <Icon name="chevron-back" color={colors.teal} />
      </TouchableOpacity>
      <View style={styles.titleContent}>
        <Text style={styles.titleText}>Override Parameter</Text>
        <View style={styles.paramPill}>
          <Text style={styles.paramPillText}>{formatParticleName(parameter)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
    backgroundColor: colors.cream,
    gap: spacing.xs,
  },
  backButton: {
    padding: spacing.sm,
  },
  titleContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  titleText: {
    ...typography.titleLg,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  paramPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tealTint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.tealTint8,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  paramPillText: {
    ...typography.body,
    fontWeight: fontWeight.bold,
    color: colors.teal,
  },
});
