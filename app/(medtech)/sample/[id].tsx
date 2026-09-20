// Path: urolens-mobile/app/(medtech)/sample/[id].tsx
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
import { latestAnalysisResultsBySpecimen } from '@db/latestAnalysisResultsBySpecimen';
import Specimen from '@db/models/Specimen';
import AnalysisResult from '@db/models/AnalysisResult';
import ManualOverride from '@db/models/ManualOverride';
import { AIDisclaimer } from '@features/result-confirmation/components/AIDisclaimer';
import { useConfirmAction } from '@features/result-confirmation/hooks/useConfirmAction';
import { ResultReviewScreen } from '@features/result-confirmation/components/ResultReviewScreen';
import { buildFindingRows, type FindingRow } from '@features/result-confirmation/lib/findingRows';
import {
  getSmartDiagnosisState,
  SMART_DIAGNOSIS_MESSAGES,
} from '@features/result-confirmation/lib/smartDiagnosisState';
import type { SmartDiagnosisJson } from '@db/models/AnalysisResult';
import { confirmRetake } from '@features/image-retake/lib/confirmRetake';
import { startAnalysis } from '@features/queue/lib/startAnalysis';
import { getSampleActions, getSampleStatusLabel } from '@features/queue/lib/sampleState';
import type { QueueItem } from '@features/queue/types';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { formatDateTime } from '@lib/dateTime';

const TEAL = '#2E7D7A';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// This screen shows a Specimen through the Queue's QueueItem shape. It doesn't derive
// isReturnedForCorrection here — it reads the loaded analysis result directly.
function toQueueItem(s: Specimen): QueueItem {
  return {
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
    isReturnedForCorrection: false,
  };
}

// The result columns this screen reads. WatermelonDB's plain `query.observe()` only
// re-emits when rows are added or removed — not when a row is updated in place, which
// is how a sync brings in a Supervisor's approval, return or escalation. Naming the
// columns makes the screen follow those changes live.
const RESULT_COLUMNS = [
  'status',
  'ai_findings_json',
  'smart_diagnosis_json',
  'smart_diagnosis_unavailable',
  'is_synced',
  'image_id',
];

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
  HIGH: { bg: '#FEE2E2', text: '#B91C1C' },
  MODERATE: { bg: '#FEF3C7', text: '#92400E' },
  LOW: { bg: '#D1FAE5', text: '#065F46' },
};
const LEVEL_LABELS: Record<string, string> = { HIGH: 'High', MODERATE: 'Moderate', LOW: 'Low' };
// A condition the engine gave no level for is neither low nor normal — don't dress it as Low.
const UNKNOWN_LEVEL_COLORS = { bg: '#F3F4F6', text: '#6B7280' };

function SmartDiagnosisSection({ diagnosis }: { diagnosis: SmartDiagnosisJson }) {
  if (diagnosis.no_significant_indicators) {
    return (
      <View style={styles.noIndicators}>
        <Ionicons name="checkmark-circle-outline" size={16} color="#065F46" />
        <Text style={styles.noIndicatorsText}>No significant diagnostic indicators found.</Text>
      </View>
    );
  }

  const conditions = [
    { label: 'Gout', level: diagnosis.gout?.level },
    { label: 'Glomerulonephritis', level: diagnosis.glomerulonephritis?.level },
    { label: 'Nephrolithiasis', level: diagnosis.nephrolithiasis?.level },
  ];

  return (
    <View style={styles.diagnosisRows}>
      {conditions.map((c) => {
        const colors = (c.level && LEVEL_COLORS[c.level]) || UNKNOWN_LEVEL_COLORS;
        return (
          <View key={c.label} style={styles.diagnosisRow}>
            <Text style={styles.diagnosisCondition}>{c.label}</Text>
            <View style={[styles.levelBadge, { backgroundColor: colors.bg }]}>
              <Text style={[styles.levelText, { color: colors.text }]}>
                {(c.level && (LEVEL_LABELS[c.level] ?? c.level)) || '—'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function AIFindingsSection({ rows }: { rows: FindingRow[] }) {
  return (
    <View style={styles.findingsRows}>
      {rows.map((row) => (
        <View key={row.key} style={styles.findingRow}>
          <View style={styles.findingDot} />
          <View style={styles.findingNameBlock}>
            <Text style={styles.findingName}>{row.label}</Text>
            {row.isOverridden && (
              <View style={styles.overriddenBadge}>
                <Text style={styles.overriddenBadgeText}>Overridden · AI: {row.aiCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.findingCount}>{row.count}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SampleDetailRoute(): React.JSX.Element {
  const { id, resultId } = useLocalSearchParams<{ id: string; resultId?: string }>();

  // The (medtech) tabs keep this screen mounted while another tab is showing, so
  // opening a different sample re-uses this same instance. Keying it on the specimen
  // remounts it instead — nothing from the previous sample (its patient, its result,
  // a "not found" state) can carry over into the next one.
  return <SampleDetail key={id} specimenId={id} resultId={resultId} />;
}

interface SampleDetailProps {
  specimenId: string;
  resultId?: string;
}

function SampleDetail({ specimenId, resultId }: SampleDetailProps): React.JSX.Element {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();

  const [specimen, setSpecimen] = useState<QueueItem | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { confirmResult: confirmAction, isConfirming } = useConfirmAction();

  // The three effects below must stay unconditional (Rules of Hooks). Internal
  // guards make them no-ops when specimenId/serverId are absent.
  useEffect(() => {
    if (!specimenId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    // `cancelled` covers the gap before find() resolves: if the screen unmounts in that
    // window there is nothing to unsubscribe yet, and a late subscribe would leak.
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    database
      .get<Specimen>('specimens')
      .find(specimenId)
      .then(
        (model) => {
          if (cancelled) return;
          subscription = model.observe().subscribe((s) => {
            setSpecimen(toQueueItem(s));
            setIsLoading(false);
          });
        },
        () => {
          if (cancelled) return;
          setNotFound(true);
          setIsLoading(false);
        },
      );

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [specimenId]);

  useEffect(() => {
    if (!specimen?.serverId) return;
    const specimenServerId = specimen.serverId;

    const subscription = database
      .get<AnalysisResult>('analysis_results')
      .query(Q.where('specimen_id', specimenServerId))
      .observeWithColumns(RESULT_COLUMNS)
      .subscribe((results) => {
        // The backend keeps one result per specimen; picking "the latest" is the same
        // safety net the Queue uses if a sync ever leaves a stale duplicate behind.
        setAnalysisResult(latestAnalysisResultsBySpecimen(results).get(specimenServerId) ?? null);
      });

    return () => subscription.unsubscribe();
  }, [specimen?.serverId]);

  useEffect(() => {
    if (!analysisResult?.serverId) return;

    const subscription = database
      .get<ManualOverride>('manual_overrides')
      .query(Q.where('result_id', analysisResult.serverId))
      .observeWithColumns(['parameter', 'corrected_value'])
      .subscribe((records) => {
        const map: Record<string, number> = {};
        for (const r of records) map[r.parameter] = r.correctedValue;
        setOverrides(map);
      });

    return () => subscription.unsubscribe();
  }, [analysisResult?.serverId]);

  // Route variation: resultId present → mount review screen directly. A specimen
  // that has since been rejected must not be reviewed or confirmed, so it falls
  // through to the regular view, which shows the rejection instead.
  if (resultId && specimen?.status !== 'REJECTED') {
    return <ResultReviewScreen resultId={resultId} specimenId={specimenId} />;
  }

  async function handleConfirmResult() {
    if (!analysisResult) return;
    const outcome = await confirmAction(analysisResult);
    if (outcome.status === 'failed') {
      Alert.alert('Confirmation Failed', outcome.message);
    }
  }

  async function handleBeginAnalysis() {
    if (!specimen?.serverId) {
      Alert.alert(
        'Not Synced',
        'This specimen has not been synced with the server yet. Please wait or pull to refresh.',
      );
      return;
    }

    // Tapping Begin is what makes the specimen In Progress. One that already is
    // (the MedTech backed out of capture earlier) has nothing left to tell the server.
    // Otherwise startAnalysis queues the change if the server can't be reached, and
    // capture proceeds regardless — but a server that refuses (say, the specimen was
    // rejected elsewhere) is not a reason to open the camera.
    if (specimen.status !== 'PROCESSING') {
      try {
        const outcome = await startAnalysis({
          specimenId,
          serverId: specimen.serverId,
          isOnline,
        });
        if (!outcome.started) {
          Alert.alert('Cannot Begin Analysis', outcome.message);
          return;
        }
      } catch {
        // Local write failed — navigation proceeds regardless.
      }
    }

    router.push({
      pathname: '/(medtech)/capture',
      params: { specimenId: specimen.serverId, localSpecimenId: specimenId },
    });
  }

  function handleRetakeImage() {
    if (!specimen?.serverId) {
      Alert.alert('Not Synced', 'Specimen has not synced yet. Please wait.');
      return;
    }
    const serverId = specimen.serverId;

    confirmRetake(Object.keys(overrides).length > 0, () => {
      router.push({
        pathname: '/(medtech)/capture',
        params: {
          specimenId: serverId,
          localSpecimenId: specimenId,
          existingImageId: analysisResult?.imageId ?? undefined,
        },
      });
    });
  }

  function handleRejectSpecimen() {
    router.push(`/(medtech)/sample/reject/${specimenId}`);
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
    HIGH: { bg: '#FCEBEB', text: '#A32D2D' },
    NORMAL: { bg: '#EAF3DE', text: '#3B6D11' },
    LOW: { bg: '#F1EFE8', text: '#5F5E5A' },
    ROUTINE: { bg: '#E8F5E9', text: '#2E7D32' },
  };
  const pColor = priorityColors[specimen.priorityLevel ?? 'NORMAL'] ?? priorityColors.NORMAL;

  const isRejected = specimen.status === 'REJECTED';
  const resultStatus = analysisResult?.status ?? null;
  const actions = getSampleActions(specimen.status, resultStatus);
  const isPendingApproval = resultStatus === 'PENDING_SUPERVISOR_APPROVAL';
  const isApproved = resultStatus === 'APPROVED';
  const isReleased = resultStatus === 'RELEASED';
  const isReturnedForCorrection = resultStatus === 'RETURNED_FOR_CORRECTION';
  const isEscalated = resultStatus === 'CRITICAL_ESCALATED';

  const smartDiagnosis = analysisResult?.smartDiagnosis ?? null;
  const diagnosisState = analysisResult
    ? getSmartDiagnosisState({
        status: analysisResult.status,
        smartDiagnosis,
        unavailable: analysisResult.smartDiagnosisUnavailable,
        isSynced: analysisResult.isSynced,
      })
    : 'AFTER_CONFIRMATION';
  const findingRows = buildFindingRows(analysisResult?.aiFindings ?? {}, overrides);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBackBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} accessibilityRole="header">
          Sample Detail
        </Text>
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
          {/* Intentional privacy decision: shows patientUid, not patientName. */}
          <Text style={styles.patientName}>{specimen.patientUid}</Text>
        </View>

        {/* Details card */}
        <View style={styles.card}>
          <DetailRow label="Patient UID" value={specimen.patientUid} />
          <View style={styles.divider} />
          <DetailRow label="Test Type" value={specimen.testType} />
          <View style={styles.divider} />
          <DetailRow label="Status" value={getSampleStatusLabel(specimen.status, resultStatus)} />
          <View style={styles.divider} />
          <DetailRow label="Received" value={formatDateTime(specimen.receivedAt)} />
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
              {smartDiagnosis && diagnosisState === 'READY' ? (
                <SmartDiagnosisSection diagnosis={smartDiagnosis} />
              ) : (
                <Text style={styles.emptyResultText}>
                  {
                    SMART_DIAGNOSIS_MESSAGES[
                      diagnosisState === 'READY' ? 'UNAVAILABLE' : diagnosisState
                    ]
                  }
                </Text>
              )}
            </View>

            {/* AI Findings */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons name="eye-outline" size={16} color={TEAL} />
                <Text style={styles.sectionSubTitle}>AI Findings</Text>
              </View>
              {findingRows.length > 0 ? (
                <AIFindingsSection rows={findingRows} />
              ) : (
                <Text style={styles.emptyResultText}>No particles detected.</Text>
              )}
            </View>

            <AIDisclaimer />

            {/* Rejected — this result will not go to the Supervisor */}
            {isRejected && (
              <View style={styles.rejectedResultBanner}>
                <Ionicons name="close-circle-outline" size={18} color="#B91C1C" />
                <View style={styles.bannerTextBlock}>
                  <Text style={styles.rejectedResultTitle}>Specimen Rejected</Text>
                  <Text style={styles.rejectedResultBody}>
                    This result cannot be confirmed and will not be sent for supervisor approval.
                  </Text>
                </View>
              </View>
            )}

            {/* Returned for correction — supervisor rejected, medtech must fix */}
            {isReturnedForCorrection && (
              <View style={styles.correctionBanner}>
                <Ionicons name="alert-circle" size={18} color="#92400E" />
                <View style={styles.bannerTextBlock}>
                  <Text style={styles.correctionTitle}>Returned for Correction</Text>
                  <Text style={styles.correctionBody}>
                    The supervisor has returned this result. Please retake the image and re-confirm.
                  </Text>
                </View>
              </View>
            )}

            {/* Escalated — with the Supervisor for urgent attention */}
            {isEscalated && (
              <View style={styles.escalatedBanner}>
                <Ionicons name="warning" size={18} color="#B91C1C" />
                <View style={styles.bannerTextBlock}>
                  <Text style={styles.escalatedTitle}>Critical / Escalated</Text>
                  <Text style={styles.escalatedBody}>
                    The supervisor has escalated this result for urgent review. No further action is
                    needed from you.
                  </Text>
                </View>
              </View>
            )}

            {/* Confirm + Retake — pending initial confirmation; Retake alone after a return */}
            {(actions.canConfirm || actions.canRetake) && (
              <View style={styles.resultActions}>
                {actions.canConfirm && (
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleConfirmResult}
                    disabled={isConfirming}
                    accessibilityRole="button"
                    accessibilityLabel="Confirm analysis result"
                  >
                    {isConfirming ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmBtnText}>Confirm Result</Text>
                    )}
                  </TouchableOpacity>
                )}
                {actions.canRetake && (
                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={handleRetakeImage}
                    accessibilityRole="button"
                    accessibilityLabel="Retake image"
                  >
                    <Text style={styles.retakeBtnText}>Retake Image</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Awaiting supervisor review */}
            {isPendingApproval && (
              <View style={styles.pendingBanner}>
                <Ionicons name="time-outline" size={16} color="#1E40AF" />
                <Text style={styles.pendingText}>Awaiting supervisor review.</Text>
              </View>
            )}

            {/* Approved by supervisor */}
            {isApproved && (
              <View style={styles.approvedBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#065F46" />
                <View style={styles.bannerTextBlock}>
                  <Text style={styles.approvedTitle}>Approved by Supervisor</Text>
                  <Text style={styles.approvedBody}>
                    This result has been reviewed and approved. It is ready for release.
                  </Text>
                </View>
              </View>
            )}

            {/* Released to patient */}
            {isReleased && (
              <View style={styles.releasedBanner}>
                <Ionicons name="send" size={16} color="#065F46" />
                <View style={styles.bannerTextBlock}>
                  <Text style={styles.approvedTitle}>Result Released</Text>
                  <Text style={styles.approvedBody}>
                    This result has been released to the patient.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          {actions.canBeginAnalysis && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={handleBeginAnalysis}
              accessibilityRole="button"
            >
              <Text style={styles.actionBtnPrimaryText}>
                {specimen.status === 'PROCESSING' ? 'Continue Analysis' : 'Begin Analysis'}
              </Text>
            </TouchableOpacity>
          )}
          {actions.canReject && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={handleRejectSpecimen}
              accessibilityRole="button"
            >
              <Text style={styles.actionBtnDangerText}>Reject Specimen</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F6F3' },
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
  priorityText: { fontSize: 12, fontWeight: '500' },
  patientName: { fontSize: 24, fontWeight: '600', color: '#1A1A1A', marginTop: 2 },

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
  emptyResultText: { fontSize: 13, color: '#6B7280', lineHeight: 18 },

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
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  levelText: { fontSize: 11, fontWeight: '700' },
  noIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noIndicatorsText: { fontSize: 13, color: '#065F46' },

  // AI findings
  findingsRows: { gap: 8 },
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
  findingNameBlock: { flex: 1, gap: 3 },
  findingName: { fontSize: 13, color: '#374151' },
  findingCount: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  // Same look as the override badge on the review screen's parameter rows.
  overriddenBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  overriddenBadgeText: { fontSize: 11, fontWeight: '500', color: '#5B21B6' },

  // Retake + Confirm row
  resultActions: { gap: 10, marginTop: 4 },
  retakeBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  retakeBtnText: { color: '#374151', fontSize: 15, fontWeight: '600' },
  confirmBtn: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // Shared banner layout
  bannerTextBlock: { flex: 1, gap: 3 },

  // Awaiting supervisor review
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  pendingText: { fontSize: 13, color: '#1E40AF', fontWeight: '500', flex: 1 },

  // Approved by supervisor
  approvedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  approvedTitle: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  approvedBody: { fontSize: 12, color: '#047857', lineHeight: 17 },

  // Released to patient
  releasedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },

  // Returned for correction
  correctionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  correctionTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  correctionBody: { fontSize: 12, color: '#B45309', lineHeight: 17 },

  // Escalated by the supervisor
  escalatedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  escalatedTitle: { fontSize: 13, fontWeight: '700', color: '#B91C1C' },
  escalatedBody: { fontSize: 12, color: '#991B1B', lineHeight: 17 },

  // Specimen rejected, result left behind
  rejectedResultBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  rejectedResultTitle: { fontSize: 13, fontWeight: '700', color: '#B91C1C' },
  rejectedResultBody: { fontSize: 12, color: '#991B1B', lineHeight: 17 },

  // Action buttons
  actions: { gap: 10, marginTop: 4 },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBtnPrimary: { backgroundColor: TEAL, borderColor: TEAL },
  actionBtnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  actionBtnDanger: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  actionBtnDangerText: { color: '#B91C1C', fontSize: 16, fontWeight: '600' },

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
