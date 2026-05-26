// Path: urolens-mobile/src/features/result-confirmation/components/AIFindingsPanel.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import ManualOverride from '@db/models/ManualOverride';
import { ParameterRow } from './ParameterRow';
import type { AIFindingEntry } from '../types';

const TEAL = '#2E7D7A';

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
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="eye-outline" size={16} color={TEAL} />
          <Text style={styles.title}>AI Findings</Text>
        </View>
        {anomalousCount > 0 && (
          <View style={styles.anomalousPill}>
            <Text style={styles.anomalousPillText}>
              {anomalousCount} anomal{anomalousCount === 1 ? 'y' : 'ies'}
            </Text>
          </View>
        )}
      </View>

      {findings.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="flask-outline" size={32} color="#C9C7C1" />
          <Text style={styles.emptyTitle}>No particles detected</Text>
          <Text style={styles.emptyBody}>AI analysis returned no findings for this image.</Text>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#F7F6F3',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  anomalousPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  anomalousPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
  },
  list: {},
  empty: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888780',
    marginTop: 4,
  },
  emptyBody: {
    fontSize: 13,
    color: '#C9C7C1',
    textAlign: 'center',
    lineHeight: 18,
  },
});