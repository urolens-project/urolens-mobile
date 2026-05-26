// Path: urolens-mobile/src/features/result-confirmation/components/SmartDiagnosisPanel.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SmartDiagnosisResult, ScoreLevel } from '../types';

const TEAL = '#2E7D7A';

interface SmartDiagnosisPanelProps {
  smartDiagnosis: SmartDiagnosisResult | null;
  unavailable: boolean;
}

const SCORE_CONFIG: Record<ScoreLevel, { bg: string; text: string; label: string }> = {
  LOW:      { bg: '#D1FAE5', text: '#065F46', label: 'Low'      },
  MODERATE: { bg: '#FEF3C7', text: '#92400E', label: 'Moderate' },
  HIGH:     { bg: '#FEE2E2', text: '#991B1B', label: 'High'     },
};

function ScoreBadge({ level }: { level: ScoreLevel }): React.JSX.Element {
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

export function SmartDiagnosisPanel({
  smartDiagnosis,
  unavailable,
}: SmartDiagnosisPanelProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="analytics-outline" size={16} color={TEAL} />
          <Text style={styles.title}>Smart Diagnosis</Text>
        </View>
        <Text style={styles.readOnly}>Supervisor review</Text>
      </View>

      {unavailable || !smartDiagnosis ? (
        <View style={styles.unavailableBox}>
          <Ionicons name="warning-outline" size={18} color="#B91C1C" />
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
          <Ionicons name="checkmark-circle-outline" size={18} color="#065F46" />
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
  readOnly: {
    fontSize: 11,
    color: '#888780',
    fontStyle: 'italic',
  },
  conditions: {},
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  conditionRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  conditionLeft: {
    flex: 1,
    marginRight: 12,
    gap: 3,
  },
  conditionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  conditionDesc: {
    fontSize: 11,
    color: '#888780',
    lineHeight: 15,
  },
  badge: {
    paddingHorizontal: 10,
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
    gap: 10,
    margin: 14,
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#FECACA',
  },
  unavailableText: {
    flex: 1,
    gap: 4,
  },
  unavailableTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B',
  },
  unavailableBody: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 17,
  },
  normalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 14,
    padding: 14,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#BBF7D0',
  },
  normalText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
  },
});