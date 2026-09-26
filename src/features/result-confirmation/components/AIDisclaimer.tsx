import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@src/theme';

/**
 * @description Mandatory compliance notice per SRS. Must appear at the top of
 * ResultReviewScreen; never conditionally hide or remove it.
 */
export function AIDisclaimer(): React.JSX.Element {
  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel="AI disclaimer"
    >
      <Text style={styles.label} accessible={false}>Clinical Decision Support</Text>
      <Text style={styles.body} accessible={false}>
        UroLens is a clinical decision-support tool. AI-generated findings and Smart Diagnosis
        indicators are not substitutes for professional medical judgment. All results must be
        reviewed and confirmed by a licensed Medical Technologist and Laboratory Supervisor.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.tealTint5,
    borderLeftWidth: 3,
    borderLeftColor: colors.teal,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.mlg,
    paddingVertical: spacing.smd,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.teal,
    letterSpacing: 0.3,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.tealDark,
  },
});
