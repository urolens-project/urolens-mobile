import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

export interface SampleActionBarProps {
  canBeginAnalysis: boolean;
  canReject: boolean;
  isProcessing: boolean;
  onBeginAnalysis: () => void;
  onReject: () => void;
}

/**
 * @description Bottom action bar for a specimen's current stage: begin (or continue)
 * analysis, and reject the specimen.
 * @param canBeginAnalysis - Whether the Begin/Continue Analysis button should render.
 * @param canReject - Whether the Reject Specimen button should render.
 * @param isProcessing - Whether analysis is already in progress, to say "Continue" instead of "Begin".
 * @param onBeginAnalysis - Called when Begin/Continue Analysis is pressed.
 * @param onReject - Called when Reject Specimen is pressed.
 */
export function SampleActionBar({
  canBeginAnalysis,
  canReject,
  isProcessing,
  onBeginAnalysis,
  onReject,
}: SampleActionBarProps): React.JSX.Element {
  return (
    <View style={styles.actions}>
      {canBeginAnalysis && (
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={onBeginAnalysis}
          accessibilityRole="button"
        >
          <Text style={styles.actionBtnPrimaryText}>
            {isProcessing ? 'Continue Analysis' : 'Begin Analysis'}
          </Text>
        </TouchableOpacity>
      )}
      {canReject && (
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnDanger]}
          onPress={onReject}
          accessibilityRole="button"
        >
          <Text style={styles.actionBtnDangerText}>Reject Specimen</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.smd, marginTop: spacing.xs },
  actionBtn: {
    borderRadius: radius.lg,
    paddingVertical: spacing.mlg,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBtnPrimary: { backgroundColor: colors.teal, borderColor: colors.teal },
  actionBtnPrimaryText: { ...typography.title, color: colors.white },
  actionBtnDanger: { backgroundColor: colors.red50, borderColor: colors.red200 },
  actionBtnDangerText: { ...typography.title, color: colors.red700 },
});
