import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@src/theme';

import { Icon } from '@components/Icon';

import type { SmartDiagnosisResult, ScoreLevel } from '../types';

export interface SmartDiagnosisPanelProps {
  smartDiagnosis: SmartDiagnosisResult | null;
  unavailable: boolean;
}

interface ScoreConfig {
  bg: string;
  text: string;
  label: string;
}

const SCORE_CONFIG: Record<ScoreLevel, ScoreConfig> = {
  LOW: { bg: colors.emerald100, text: colors.emerald800, label: 'Low' },
  MODERATE: { bg: colors.amber100, text: colors.amber800, label: 'Moderate' },
  HIGH: { bg: colors.red100, text: colors.red800, label: 'High' },
};

interface ScoreBadgeProps {
  level: ScoreLevel;
}

function ScoreBadge({ level }: ScoreBadgeProps): React.JSX.Element {
  const cfg = SCORE_CONFIG[level] ?? SCORE_CONFIG.LOW;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

interface ConditionRowProps {
  label: string;
  description: string;
  score: ScoreLevel;
  isLast?: boolean;
}

function ConditionRow({ label, description, score, isLast }: ConditionRowProps): React.JSX.Element {
  return (
    <View style={[styles.conditionRow, !isLast && styles.conditionRowBorder]}>
      <View style={styles.conditionLeft}>
        <Text style={styles.conditionLabel}>{label}</Text>
        <Text style={styles.conditionDesc}>{description}</Text>
      </View>
      <ScoreBadge level={score} />
    </View>
  );
}

/**
 * @description Card showing the three Smart Diagnosis condition scores (gout,
 * glomerulonephritis, nephrolithiasis), or an unavailable/no-indicators message.
 * @param smartDiagnosis - The diagnosis payload, or null if not yet available.
 * @param unavailable - True when the engine reported an error for this result.
 */
export function SmartDiagnosisPanel({
  smartDiagnosis,
  unavailable,
}: SmartDiagnosisPanelProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="analytics-outline" size={16} color={colors.teal} />
          <Text style={styles.title}>Smart Diagnosis</Text>
        </View>
        <Text style={styles.readOnly}>Supervisor review</Text>
      </View>

      {unavailable || !smartDiagnosis ? (
        <View style={styles.unavailableBox}>
          <Icon name="warning-outline" size={18} color={colors.red700} />
          <View style={styles.unavailableText}>
            <Text style={styles.unavailableTitle}>Diagnosis unavailable</Text>
            <Text style={styles.unavailableBody}>
              The Smart Diagnosis engine encountered an error. The Supervisor has been
              notified and your confirmation has been recorded.
            </Text>
          </View>
        </View>
      ) : smartDiagnosis.noSignificantIndicators ? (
        <View style={styles.normalBox}>
          <Icon name="checkmark-circle-outline" size={18} color={colors.emerald800} />
          <Text style={styles.normalText}>
            No significant clinical indicators detected. All scores within normal range.
          </Text>
        </View>
      ) : (
        <View style={styles.conditions}>
          <ConditionRow
            label="Gout"
            description="Urate crystal probability based on particle classification"
            score={smartDiagnosis.goutScore}
          />
          <ConditionRow
            label="Glomerulonephritis"
            description="Cellular cast and protein marker indicators"
            score={smartDiagnosis.gnScore}
          />
          <ConditionRow
            label="Nephrolithiasis"
            description="Renal tubular cell and granular cast findings"
            score={smartDiagnosis.nephroScore}
            isLast
          />
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
  readOnly: {
    fontSize: 11,
    color: colors.warmGray500,
    fontStyle: 'italic',
  },
  conditions: {},
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mlg,
  },
  conditionRowBorder: {
    borderBottomWidth: 0.5,
    // TODO(theme): near-black hairline at 0.06 alpha not in palette.
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  conditionLeft: {
    flex: 1,
    marginRight: spacing.md,
    gap: 3,
  },
  conditionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  conditionDesc: {
    fontSize: 11,
    color: colors.warmGray500,
    lineHeight: 15,
  },
  badge: {
    paddingHorizontal: spacing.smd,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  unavailableBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.smd,
    margin: spacing.mlg,
    padding: spacing.mlg,
    backgroundColor: colors.red50,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: colors.red200,
  },
  unavailableText: {
    flex: 1,
    gap: spacing.xs,
  },
  unavailableTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.red800,
  },
  unavailableBody: {
    fontSize: 12,
    color: colors.red900,
    lineHeight: 17,
  },
  normalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    margin: spacing.mlg,
    padding: spacing.mlg,
    backgroundColor: colors.green50,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: colors.green200,
  },
  normalText: {
    flex: 1,
    fontSize: 13,
    color: colors.emerald800,
    lineHeight: 18,
  },
});