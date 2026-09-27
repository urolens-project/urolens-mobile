import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

export interface OverrideFormTitleBarProps {
  parameter: string;
  onBack: () => void;
}

function formatParameter(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * @description Fixed title bar: back button, screen title, and the parameter being overridden.
 * @param parameter - Machine name of the parameter (e.g. "RBC"), shown human-formatted.
 * @param onBack - Called when the back button is tapped.
 */
export function OverrideFormTitleBar({
  parameter,
  onBack,
}: OverrideFormTitleBarProps): React.JSX.Element {
  return (
    <View style={styles.titleBar}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        accessibilityLabel="Go back to Analysis Result"
        accessibilityRole="button"
      >
        <Icon name="chevron-back" size={26} color={colors.teal} />
      </TouchableOpacity>
      <View style={styles.titleContent}>
        <Text style={styles.titleText}>Override Parameter</Text>
        <View style={styles.paramPill}>
          <Text style={styles.paramPillText}>{formatParameter(parameter)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
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
    backgroundColor: 'rgba(46,125,122,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(46,125,122,0.3)',
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
