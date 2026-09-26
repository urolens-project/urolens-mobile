import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

export interface InfoRowProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}

/**
 * @description One icon + label/value row inside a Profile card.
 * @param icon - Ionicons glyph shown in the leading icon chip.
 * @param label - Field name.
 * @param value - Field value, already formatted for display.
 */
export function InfoRow({ icon, label, value }: InfoRowProps): React.JSX.Element {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Icon name={icon} size={18} color={colors.teal} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.mlg,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(46,125,122,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    gap: spacing.xxs,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.gray400,
    fontWeight: fontWeight.medium,
  },
  infoValue: {
    ...typography.bodyLg,
    color: colors.gray900,
    fontWeight: fontWeight.medium,
  },
});
