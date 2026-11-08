import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@src/theme';

import { RESULT_CONFIRMATION_TEXT } from '../constants/resultConfirmationText.constant';

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
      accessibilityLabel={RESULT_CONFIRMATION_TEXT.aiDisclaimer.accessibilityLabel}
    >
      <Text style={styles.label} accessible={false}>
        {RESULT_CONFIRMATION_TEXT.aiDisclaimer.label}
      </Text>
      <Text style={styles.body} accessible={false}>
        {RESULT_CONFIRMATION_TEXT.aiDisclaimer.body}
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
