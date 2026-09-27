import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

export interface BlockedRejectionCardProps {
  reason: string;
  onBackToSample: () => void;
}

/**
 * @description Shown instead of the rejection form when the workflow disallows
 * rejecting this specimen right now.
 * @param reason - Why rejection is blocked, from `getRejectBlockedReason`.
 * @param onBackToSample - Called when "Back to sample" is pressed.
 */
export function BlockedRejectionCard({
  reason,
  onBackToSample,
}: BlockedRejectionCardProps): React.JSX.Element {
  return (
    <View style={styles.blockedCard} accessibilityRole="alert">
      <Icon name="information-circle-outline" size={20} color={colors.amber800} />
      <View style={styles.blockedText}>
        <Text style={styles.blockedTitle}>Cannot reject this specimen</Text>
        <Text style={styles.blockedBody}>{reason}</Text>
        <TouchableOpacity style={styles.blockedBtn} onPress={onBackToSample} accessibilityRole="button">
          <Text style={styles.blockedBtnText}>Back to sample</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blockedCard: {
    flexDirection: 'row',
    gap: spacing.smd,
    backgroundColor: colors.amber50,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.amber200,
    padding: spacing.lg,
  },
  blockedText: { flex: 1, gap: spacing.sm },
  blockedTitle: { ...typography.bodyLg, fontWeight: fontWeight.bold, color: colors.amber800 },
  blockedBody: { ...typography.body, color: colors.amber700, lineHeight: 19 },
  blockedBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.mlg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.amber200,
  },
  blockedBtnText: { ...typography.body, fontWeight: fontWeight.semibold, color: colors.amber800 },
});
