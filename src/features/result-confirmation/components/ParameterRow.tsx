// Path: urolens-mobile/src/features/result-confirmation/components/ParameterRow.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { AIFindingEntry } from '../types';

interface ParameterRowProps {
  finding: AIFindingEntry;
  overriddenValue?: number; // set when a ManualOverride exists for this parameter
  onOverride: (parameter: string, originalValue: number) => void;
  disabled?: boolean;
}

export function ParameterRow({
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
        {finding.isAnomalous && (
          <View style={styles.anomalousBadge}>
            <Text style={styles.anomalousBadgeText}>Anomalous</Text>
          </View>
        )}
        {isOverridden && (
          <View style={styles.overriddenBadge}>
            <Text style={styles.overriddenBadgeText}>
              Overridden (AI: {finding.count})
            </Text>
          </View>
        )}
      </View>

      <View style={styles.right}>
        <Text style={[styles.count, finding.isAnomalous && styles.anomalousCount]}>
          {displayValue}
        </Text>
        <TouchableOpacity
          style={[styles.overrideButton, disabled && styles.overrideButtonDisabled]}
          onPress={() => onOverride(finding.parameter, finding.count)}
          disabled={disabled}
          accessibilityLabel={`Override ${finding.parameter}`}
          accessibilityRole="button"
        >
          <Text style={[styles.overrideButtonText, disabled && styles.overrideButtonTextDisabled]}>
            Override
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  anomalousRow: {
    backgroundColor: '#FFF7ED',
  },
  left: {
    flex: 1,
    gap: 4,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  parameterName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textTransform: 'capitalize',
  },
  count: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    minWidth: 32,
    textAlign: 'right',
  },
  anomalousCount: {
    color: '#C2410C',
  },
  anomalousBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  anomalousBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#92400E',
  },
  overriddenBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overriddenBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#5B21B6',
  },
  overrideButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  overrideButtonDisabled: {
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  overrideButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  overrideButtonTextDisabled: {
    color: '#9CA3AF',
  },
});