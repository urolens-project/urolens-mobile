import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@src/theme';

import type { AIFindingEntry } from '../types';

export interface ParameterRowProps {
  finding: AIFindingEntry;
  overriddenValue?: number;
  onOverride: (parameter: string, originalValue: number) => void;
  disabled?: boolean;
}

/**
 * @description One AI-findings row: parameter name, its value (AI count or MedTech
 * override), anomaly/override badges, and an override button.
 * @param finding - AI finding entry to render.
 * @param overriddenValue - MedTech's corrected count, if this parameter was overridden.
 * @param onOverride - Called with the parameter name and its original AI count.
 * @param disabled - Hides the override button when true (e.g. after confirmation).
 */
function ParameterRowComponent({
  finding,
  overriddenValue,
  onOverride,
  disabled = false,
}: ParameterRowProps): React.JSX.Element {
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
              <Text style={styles.anomalousBadgeText}>Anomalous</Text>
            </View>
          )}
          {isOverridden && (
            <View style={styles.overriddenBadge}>
              <Text style={styles.overriddenBadgeText}>Overridden · AI: {finding.count}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.count, finding.isAnomalous && styles.anomalousCount]}>
          {displayValue}
        </Text>
        {!disabled && (
          <TouchableOpacity
            style={styles.overrideButton}
            onPress={() => onOverride(finding.parameter, finding.count)}
            accessibilityLabel={`Override ${finding.parameter}`}
            accessibilityRole="button"
          >
            <Text style={styles.overrideButtonText}>Override</Text>
          </TouchableOpacity>
        )}
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
  overrideButton: {
    paddingHorizontal: spacing.smd,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
  },
  overrideButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray700,
  },
});

export const ParameterRow = React.memo(ParameterRowComponent);