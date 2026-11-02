import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

import { SAMPLE_TEXT } from '../constants/sampleText.constant';

export interface SampleActionBarProps {
  canBeginAnalysis: boolean;
  /** Resume the multi-field capture session (SDD Module 2 proposal) — mutually
   * exclusive with canBeginAnalysis (the result is already CAPTURING). */
  canContinueCapturing?: boolean;
  canReject: boolean;
  isProcessing: boolean;
  onBeginAnalysis: () => void;
  onContinueCapturing?: () => void;
  onReject: () => void;
}

/**
 * @description Bottom action bar for a specimen's current stage: begin (or continue)
 * analysis or capturing, and reject the specimen.
 * @param canBeginAnalysis - Whether the Begin/Continue Analysis button should render.
 * @param canContinueCapturing - Whether the Continue Capturing button should render instead.
 * @param canReject - Whether the Reject Specimen button should render.
 * @param isProcessing - Whether analysis is already in progress, to say "Continue" instead of "Begin".
 * @param onBeginAnalysis - Called when Begin/Continue Analysis is pressed.
 * @param onContinueCapturing - Called when Continue Capturing is pressed.
 * @param onReject - Called when Reject Specimen is pressed.
 */
export function SampleActionBar({
  canBeginAnalysis,
  canContinueCapturing = false,
  canReject,
  isProcessing,
  onBeginAnalysis,
  onContinueCapturing,
  onReject,
}: SampleActionBarProps): React.JSX.Element {
  return (
    <View style={styles.actions}>
      {canContinueCapturing && (
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={onContinueCapturing}
          accessibilityRole="button"
        >
          <Text style={styles.actionBtnPrimaryText}>{SAMPLE_TEXT.continueCapturing}</Text>
        </TouchableOpacity>
      )}
      {canBeginAnalysis && (
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={onBeginAnalysis}
          accessibilityRole="button"
        >
          <Text style={styles.actionBtnPrimaryText}>
            {isProcessing ? SAMPLE_TEXT.continueAnalysis : SAMPLE_TEXT.beginAnalysis}
          </Text>
        </TouchableOpacity>
      )}
      {canReject && (
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnDanger]}
          onPress={onReject}
          accessibilityRole="button"
        >
          <Text style={styles.actionBtnDangerText}>{SAMPLE_TEXT.rejectSpecimen}</Text>
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
