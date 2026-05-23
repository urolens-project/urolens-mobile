import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { Ionicons } from '@expo/vector-icons';
import { database } from '@db/database';
import { synchronize } from '@db/sync/syncManager';
import Specimen from '@db/models/Specimen';
import AnalysisResult from '@db/models/AnalysisResult';
import { AIDisclaimer } from '@features/result-confirmation/components/AIDisclaimer';
import { useConfirmResult } from '@features/result-confirmation/hooks/useConfirmResult';
import { ResultStatus } from '@app-types/enums';
import type { SmartDiagnosisDTO } from '@app-types/domain';
import type { QueueItem } from '../../../src/features/queue/types';

const TEAL = '#2E7D7A';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatParticleName(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  HIGH:     { bg: '#FEE2E2', text: '#B91C1C' },
  MODERATE: { bg: '#FEF3C7', text: '#92400E' },
  LOW:      { bg: '#D1FAE5', text: '#065F46' },
};

function SmartDiagnosisSection({ diagnosis }: { diagnosis: SmartDiagnosisDTO }) {
  if (diagnosis.no_significant_indicators) {
    return (
      <View style={styles.noIndicators}>
        <Ionicons name="checkmark-circle-outline" size={16} color="#065F46" />
        <Text style={styles.noIndicatorsText}>No significant diagnostic indicators found.</Text>
      </View>
    );
  }

  const conditions = (
    ['gout', 'glomerulonephritis', 'nephrolithiasis'] as const
  )
    .map((key) => diagnosis[key])
    .filter(Boolean)
    .sort((a, b) => b.weighted_score - a.weighted_score);

  return (
    <View style={styles.diagnosisRows}>
      {conditions.map((c) => {
        const colors = LEVEL_COLORS[c.level] ?? LEVEL_COLORS.LOW;
        return (
          <View key={c.condition} style={styles.diagnosisRow}>
            <Text style={styles.diagnosisCondition}>{c.condition}</Text>
            <View style={styles.diagnosisRight}>
              <View style={[styles.levelBadge, { backgroundColor: colors.bg }]}>
                <Text style={[styles.levelText, { color: colors.text }]}>{c.level}</Text>
              </View>
              <Text style={styles.diagnosisScore}>{c.weighted_score.toFixed(2)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function AIFindingsSection({ findings }: { findings: Record<string, number> }) {
  const entries = Object.entries(findings).filter(([, count]) => count > 0);
  if (!entries.length) return null;

  return (
    <View style={styles.findingsRows}>
      {entries.map(([key, count]) => (
        <View key={key} style={styles.findingRow}>
          <View style={styles.findingDot} />
          <Text style={styles.findingName}>{formatParticleName(key)}</Text>
          <Text style={styles.findingCount}>{count}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SampleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [specimen, setSpecimen] = useState<QueueItem | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { confirm, isLoading: isConfirming } = useConfirmResult();

  // Sync on mount so analysis results are always fresh
  useEffect(() => {
    synchronize().catch(() => {});
  }, []);

  // Observe specimen
  useEffect(() => {
    if (!id) return;

    const subscription = database
      .get<Specimen>('specimens')
      .query(Q.where('id', id))
      .observe()
      .subscribe((results) => {
        if (results.length === 0) {
          setNotFound(true);
        } else {
          const s = results[0];
          setSpecimen({
            id: s.id,
            serverId: s.serverId,
            sampleUid: s.sampleUid,
            patientName: s.patientName,
            patientUid: s.patientUid,
            testType: s.testType,
            status: s.status as QueueItem['status'],
            priorityLevel: s.priorityLevel as QueueItem['priorityLevel'],
            receivedAt: s.receivedAt,
            medtechId: s.medtechId,
            rejectionReason: s.rejectionReason,
            rejectionNote: s.rejectionNote,
            rejectedAt: s.rejectedAt,
            syncedAt: s.syncedAt,
          });
        }
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [id]);

  // Observe analysis results once specimen is known
  useEffect(() => {
    if (!specimen?.serverId) return;

    const subscription = database
      .get<AnalysisResult>('analysis_results')
      .query(Q.where('specimen_id', specimen.serverId))
      .observe()
      .subscribe((results) => {
        setAnalysisResult(results[0] ?? null);
      });

    return () => subscription.unsubscribe();
  }, [specimen?.serverId]);

  async function handleConfirmResult() {
    if (!analysisResult) return;
    try {
      await confirm(analysisResult.id, analysisResult.serverId, undefined);
    } catch (err) {
      const e = err as { message?: string };
      const message = e?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.');
      Alert.alert('Confirmation Failed', message);
    }
  }

  function handleBeginAnalysis() {
    router.push(`/(medtech)/capture?specimenId=${id}`);
  }

  function handleRejectSpecimen() {
    router.push(`/(medtech)/sample/reject/${id}`);
  }

  function handleRequestReassignment() {
    Alert.alert(
      'Request Reassignment',
      'Are you sure you want to request reassignment for this sample?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: () => Alert.alert('Reassignment requested.'),
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={TEAL} />
      </SafeAreaView>
    );
  }

  if (notFound || !specimen) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.notFoundText}>Sample not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const priorityColors: Record<string, { bg: string; text: string }> = {
    HIGH:   { bg: '#FCEBEB', text: '#A32D2D' },
    NORMAL: { bg: '#EAF3DE', text: '#3B6D11' },
    LOW:    { bg: '#F1EFE8', text: '#5F5E5A' },
  };
  const pColor = priorityColors[specimen.priorityLevel ?? 'NORMAL'];

  const isRejected       = specimen.status === 'REJECTED';
  const smartDiagnosis   = analysisResult?.smartDiagnosis ?? null;
  const aiFindings       = analysisResult?.aiFindings ?? {};
  const isPendingConfirm = analysisResult?.status === ResultStatus.PENDING_CONFIRM;
  const isConfirmed      = analysisResult?.status === ResultStatus.PENDING_SUPERVISOR_APPROVAL
                        || analysisResult?.status === ResultStatus.APPROVED
                        || analysisResult?.status === ResultStatus.RELEASED;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBackBtn} onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Sample Detail</Text>
        <View style={styles.topBackBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderTop}>
            <Text style={styles.sampleUid}>{specimen.sampleUid}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: pColor.bg }]}>
              <Text style={[styles.priorityText, { color: pColor.text }]}>
                {specimen.priorityLevel ?? 'NORMAL'}
              </Text>
            </View>
          </View>
          <Text style={styles.patientName}>{specimen.patientName}</Text>
        </View>

        {/* Details card */}
        <View style={styles.card}>
          <DetailRow label="Patient UID"  value={specimen.patientUid} />
          <View style={styles.divider} />
          <DetailRow label="Test Type"   value={specimen.testType} />
          <View style={styles.divider} />
          <DetailRow label="Status"      value={specimen.status.replace('_', ' ')} />
          <View style={styles.divider} />
          <DetailRow label="Received"    value={formatDateTime(specimen.receivedAt)} />
        </View>

        {/* Rejection details */}
        {isRejected && (
          <View style={styles.rejectionCard}>
            <View style={styles.rejectionHeader}>
              <Ionicons name="close-circle" size={16} color="#B91C1C" />
              <Text style={styles.rejectionTitle}>Specimen Rejected</Text>
            </View>
            {specimen.rejectionReason && (
              <DetailRow label="Reason" value={specimen.rejectionReason.replace(/_/g, ' ')} />
            )}
            {specimen.rejectionNote ? (
              <>
                <View style={styles.divider} />
                <DetailRow label="Note" value={specimen.rejectionNote} />
              </>
            ) : null}
            {specimen.rejectedAt && (
              <>
                <View style={styles.divider} />
                <DetailRow label="Rejected At" value={formatDateTime(specimen.rejectedAt)} />
              </>
            )}
          </View>
        )}

        {/* Analysis results */}
        {analysisResult && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Analysis Results</Text>

            {/* Smart Diagnosis */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons name="analytics-outline" size={16} color={TEAL} />
                <Text style={styles.sectionSubTitle}>Smart Diagnosis</Text>
              </View>
              {smartDiagnosis
                ? <SmartDiagnosisSection diagnosis={smartDiagnosis} />
                : <Text style={styles.emptyResultText}>Diagnosis not available.</Text>
              }
            </View>

            {/* AI Findings */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons name="eye-outline" size={16} color={TEAL} />
                <Text style={styles.sectionSubTitle}>AI Findings</Text>
              </View>
              {Object.keys(aiFindings).length > 0
                ? <AIFindingsSection findings={aiFindings} />
                : <Text style={styles.emptyResultText}>No particles detected.</Text>
              }
            </View>

            <AIDisclaimer />

            {/* Confirm result */}
            {isPendingConfirm && (
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmResult}
                disabled={isConfirming}
                accessibilityRole="button"
                accessibilityLabel="Confirm analysis result"
              >
                {isConfirming
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Text style={styles.confirmBtnText}>Confirm Result</Text>
                }
              </TouchableOpacity>
            )}

            {isConfirmed && (
              <View style={styles.confirmedBanner}>
                <Ionicons name="checkmark-circle" size={16} color="#065F46" />
                <Text style={styles.confirmedText}>Result submitted for supervisor approval.</Text>
              </View>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          {!analysisResult && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={handleBeginAnalysis}
              accessibilityRole="button"
            >
              <Text style={styles.actionBtnPrimaryText}>Begin Analysis</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={handleRejectSpecimen}
            accessibilityRole="button"
          >
            <Text style={styles.actionBtnDangerText}>Reject Specimen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={handleRequestReassignment}
            accessibilityRole="button"
          >
            <Text style={styles.actionBtnSecondaryText}>Request Reassignment</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F7F6F3' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F6F3' },
  scroll: { padding: 16, paddingBottom: 40 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#F7F6F3',
  },
  topBackBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  // Specimen header
  cardHeader: { marginBottom: 16 },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sampleUid: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#888780',
    letterSpacing: 0.5,
  },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  priorityText:  { fontSize: 12, fontWeight: '500' },
  patientName:   { fontSize: 24, fontWeight: '600', color: '#1A1A1A', marginTop: 2 },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    padding: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailLabel: { fontSize: 14, color: '#888780' },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  divider: { height: 0.5, backgroundColor: 'rgba(0,0,0,0.08)' },

  // Analysis results section
  resultsSection: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionSubTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  emptyResultText: { fontSize: 13, color: '#9CA3AF' },

  // Smart diagnosis
  diagnosisRows: { gap: 8 },
  diagnosisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diagnosisCondition: {
    fontSize: 14,
    color: '#1A1A1A',
    textTransform: 'capitalize',
    flex: 1,
  },
  diagnosisRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  levelText:        { fontSize: 11, fontWeight: '700' },
  diagnosisScore:   { fontSize: 13, fontWeight: '600', color: '#6B7280', width: 36, textAlign: 'right' },
  noIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noIndicatorsText: { fontSize: 13, color: '#065F46' },

  // AI findings
  findingsRows: { gap: 6 },
  findingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  findingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TEAL,
  },
  findingName:  { flex: 1, fontSize: 13, color: '#374151' },
  findingCount: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },

  // Confirm / confirmed
  confirmBtn: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  confirmedText: { fontSize: 13, color: '#065F46', fontWeight: '500', flex: 1 },

  // Action buttons
  actions: { gap: 10, marginTop: 4 },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBtnPrimary:      { backgroundColor: '#185FA5', borderColor: '#185FA5' },
  actionBtnPrimaryText:  { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  actionBtnDanger:       { backgroundColor: '#FCEBEB', borderColor: '#F7C1C1' },
  actionBtnDangerText:   { color: '#A32D2D', fontSize: 16, fontWeight: '500' },
  actionBtnSecondary:    { backgroundColor: '#FFFFFF', borderColor: 'rgba(0,0,0,0.15)' },
  actionBtnSecondaryText:{ color: '#5F5E5A', fontSize: 16, fontWeight: '500' },

  // Rejection card
  rejectionCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#FECACA',
    padding: 16,
    marginBottom: 12,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B91C1C',
  },

  // Not found
  notFoundText: { fontSize: 17, color: '#5F5E5A', marginBottom: 16 },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#185FA5',
    borderRadius: 8,
  },
  backBtnText: { color: '#FFFFFF', fontWeight: '500' },
});
