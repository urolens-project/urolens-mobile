import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing, typography } from '@src/theme';

export interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

/**
 * @description Generic empty/placeholder state: a title and an optional subtitle,
 * centered in the available space.
 * @param title - Primary message.
 * @param subtitle - Optional supporting detail shown below the title.
 */
export function EmptyState({ title, subtitle }: EmptyStateProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.huge },
  title: { ...typography.title, color: colors.gray700, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.gray400, textAlign: 'center' },
});
