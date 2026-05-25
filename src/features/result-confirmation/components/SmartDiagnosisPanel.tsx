// Path: urolens-mobile/src/features/result-confirmation/components/SmartDiagnosisPanel.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SmartDiagnosisResult, ScoreLevel } from '../types';

interface SmartDiagnosisPanelProps {
  smartDiagnosis: SmartDiagnosisResult | null;
  unavailable: boolean;
}

interface ScoreBadgeProps {
  level: ScoreLevel;
}

function ScoreBadge({ level }: ScoreBadgeProps): React.JSX.Element {
  const config: Record<ScoreLevel, { bg: string; text: string; label: string }> = {
    LOW:      { bg: '#DCFCE7', text: '#166534', label: 'Low'      },
    MODERATE: { bg: '#FEF9C3', text: '#854D0E', label: 'Moderate' },
    HIGH:     { bg: '#FEE2E2', text: '#991B1B', label: 'High'     },
  };
  const { bg, text, label } = config[level];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: text }]}>{label}</Text>
    </View>
  );
}

interface ConditionCardProps {
  label: string;
  score: ScoreLevel;
  description: string;
}

function ConditionCard({ label, score, description }: ConditionCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardLabel}>{label}</Text>
        <ScoreBadge level={score} />
      </View>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  );
}

export function SmartDiagnosisPanel({
  smartDiagnosis,
  unavailable,
}: SmartDiagnosisPanelProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Diagnosis</Text>
        <Text style={styles.subtitle}>Read-only — Supervisor will review</Text>
      </View>

      {unavailable || !smartDiagnosis ? (
        <View style={styles.unavailable}>
          <Text style={styles.unavailableTitle}>Diagnosis unavailable</Text>
          <Text style={styles.unavailableBody}>
            The Smart Diagnosis engine encountered an error. The Supervisor has been
            notified. Your confirmation has been recorded successfully.
          </Text>
        </View>
      ) : smartDiagnosis.noSignificantIndicators ? (
        <View style={styles.noIndicators}>
          <Text style={styles.noIndicatorsText}>
            No significant clinical indicators detected. All scores within normal range.
          </Text>
        </View>
      ) : (
        <View style={styles.cards}>
          <ConditionCard
            label="Gout"
            score={smartDiagnosis.goutScore}
            description="Urate crystal probability based on particle classification"
          />
          <ConditionCard
            label="Glomerulonephritis"
            score={smartDiagnosis.gnScore}
            description="Cellular cast and protein marker indicators"
          />
          <ConditionCard
            label="Nephropathy"
            score={smartDiagnosis.nephroScore}
            description="Renal tubular cell and granular cast findings"
          />
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
  subtitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  cards: {
    gap: 1,
    backgroundColor: '#E5E7EB',
  },
  card: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  cardDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  unavailable: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    margin: 12,
    borderRadius: 8,
  },
  unavailableTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
  },
  unavailableBody: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  noIndicators: {
    padding: 16,
    backgroundColor: '#F0FDF4',
    margin: 12,
    borderRadius: 8,
  },
  noIndicatorsText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
});