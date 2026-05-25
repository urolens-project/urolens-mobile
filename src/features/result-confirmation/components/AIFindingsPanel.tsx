// Path: urolens-mobile/src/features/result-confirmation/components/AIFindingsPanel.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import ManualOverride from '@db/models/ManualOverride';
import { ParameterRow } from './ParameterRow';
import type { AIFindingEntry } from '../types';

interface AIFindingsPanelProps {
  resultId: string;           // server_id of the AnalysisResult
  findings: AIFindingEntry[];
  onOverride: (parameter: string, originalValue: number) => void;
  isConfirmed: boolean;
}

export function AIFindingsPanel({
  resultId,
  findings,
  onOverride,
  isConfirmed,
}: AIFindingsPanelProps): React.JSX.Element {
  const database = useDatabase();
  const [overrides, setOverrides] = React.useState<Record<string, number>>({});

  // Observe local ManualOverride records for this result
  React.useEffect(() => {
    const subscription = database
      .get<ManualOverride>('manual_overrides')
      .query(Q.where('result_id', resultId))
      .observe()
      .subscribe((records) => {
        const map: Record<string, number> = {};
        records.forEach((r) => {
          map[r.parameter] = r.correctedValue;
        });
        setOverrides(map);
      });

    return () => subscription.unsubscribe();
  }, [resultId, database]);

  const anomalousCount = findings.filter((f) => f.isAnomalous).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Findings</Text>
        {anomalousCount > 0 && (
          <View style={styles.anomalousSummary}>
            <Text style={styles.anomalousSummaryText}>
              {anomalousCount} anomal{anomalousCount === 1 ? 'y' : 'ies'}
            </Text>
          </View>
        )}
      </View>

      {findings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No particles detected</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {findings.map((finding) => (
            <ParameterRow
              key={finding.parameter}
              finding={finding}
              overriddenValue={overrides[finding.parameter]}
              onOverride={onOverride}
              disabled={isConfirmed}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  anomalousSummary: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  anomalousSummaryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
  },
  list: {
    // ParameterRow components render with their own borders
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
});