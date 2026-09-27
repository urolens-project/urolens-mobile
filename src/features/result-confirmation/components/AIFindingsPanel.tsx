import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import ManualOverride from '@db/models/ManualOverride';
import { colors, radius, spacing } from '@src/theme';

import { Icon } from '@components/Icon';

import { ParameterRow } from './ParameterRow';
import type { AIFindingEntry } from '../types';

export interface AIFindingsPanelProps {
  /** server_id of the AnalysisResult. */
  resultId: string;
  findings: AIFindingEntry[];
  onOverride: (parameter: string, originalValue: number) => void;
  isConfirmed: boolean;
}

/**
 * @description Card listing every AI-detected particle for a result, with a live count
 * of MedTech-overridden parameters from the local `manual_overrides` table.
 * @param resultId - Server id of the analysis result these findings belong to.
 * @param findings - AI findings to render as rows.
 * @param onOverride - Called with a parameter name and its original AI count.
 * @param isConfirmed - Hides override controls once the result is confirmed.
 */
function AIFindingsPanelComponent({
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
          <Icon name="eye-outline" size={16} color={colors.teal} />
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
          <Icon name="flask-outline" size={32} color={colors.warmGray200} />
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
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    // TODO(theme): near-black hairline at 0.1 alpha not in palette.
    borderColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mlg,
    borderBottomWidth: 0.5,
    // TODO(theme): near-black hairline at 0.08 alpha not in palette.
    borderBottomColor: 'rgba(0,0,0,0.08)',
    backgroundColor: colors.cream,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  anomalousPill: {
    backgroundColor: colors.amber100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 10,
  },
  anomalousPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.amber800,
  },
  list: {},
  empty: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: spacing.lg,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.warmGray500,
    marginTop: spacing.xs,
  },
  emptyBody: {
    fontSize: 13,
    color: colors.warmGray200,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export const AIFindingsPanel = React.memo(AIFindingsPanelComponent);