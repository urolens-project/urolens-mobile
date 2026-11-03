import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing } from '@src/theme';

import { RESULT_CONFIRMATION_TEXT } from '../../constants/resultConfirmationText.constant';
import type { AIFindingEntry } from '../../types';

export interface ParameterRowProps {
  finding: AIFindingEntry;
  overriddenValue?: number;
}

/**
 * @description One AI-findings row: parameter name, its value (AI count or MedTech
 * override, read-only — overriding now happens on the website, mobile PR #55 review,
 * #3) and anomaly/override badges.
 * @param finding - AI finding entry to render.
 * @param overriddenValue - MedTech's corrected count, if this parameter was overridden.
 */
function ParameterRowComponent({ finding, overriddenValue }: ParameterRowProps): React.JSX.Element {
  const displayValue = overriddenValue ?? finding.count;
  const isOverridden = overriddenValue !== undefined;

  return (
    <View
      style={[styles.row, finding.isAnomalous && styles.anomalousRow]}
      accessibilityLabel={`${finding.parameter}: ${displayValue}`}
    >
      <View style={styles.left}>
        <Text style={styles.parameterName}>{finding.parameter}</Text>
        <View style={styles.badges}>
          {finding.isAnomalous && (
            <View style={styles.anomalousBadge}>
              <Text style={styles.anomalousBadgeText}>
                {RESULT_CONFIRMATION_TEXT.parameterRow.anomalousBadge}
              </Text>
            </View>
          )}
          {isOverridden && (
            <View style={styles.overriddenBadge}>
              <Text style={styles.overriddenBadgeText}>
                {RESULT_CONFIRMATION_TEXT.parameterRow.overriddenBadgeLabel(finding.count)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.count, finding.isAnomalous && styles.anomalousCount]}>
          {displayValue}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.mlg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    // TODO(theme): near-black hairline at 0.06 alpha not in palette.
    borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: colors.white,
  },
  anomalousRow: {
    backgroundColor: colors.amberTint1,
  },
  left: {
    flex: 1,
    gap: 5,
    marginRight: spacing.md,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  parameterName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.ink,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  count: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    minWidth: 32,
    textAlign: 'right',
  },
  anomalousCount: {
    color: colors.amber700,
  },
  anomalousBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.amber100,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  anomalousBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.amber800,
  },
  overriddenBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.violet100,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  overriddenBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.violet800,
  },
});

export const ParameterRow = React.memo(ParameterRowComponent);
