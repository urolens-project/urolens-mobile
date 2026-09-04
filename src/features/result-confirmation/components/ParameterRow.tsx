// Path: urolens-mobile/src/features/result-confirmation/components/ParameterRow.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { AIFindingEntry } from '../types';

interface ParameterRowProps {
  finding: AIFindingEntry;
  overriddenValue?: number;
  onOverride: (parameter: string, originalValue: number) => void;
  disabled?: boolean;
}


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
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#FFFFFF',
  },
  anomalousRow: {
    backgroundColor: '#FFFBF0',
  },
  left: {
    flex: 1,
    gap: 5,
    marginRight: 12,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  parameterName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  count: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    minWidth: 32,
    textAlign: 'right',
  },
  anomalousCount: {
    color: '#B45309',
  },
  anomalousBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  anomalousBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  overriddenBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
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
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  overrideButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
});

export const ParameterRow = React.memo(ParameterRowComponent);