import { useCallback, useEffect, useState } from 'react';
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

import { database } from '@db/database';
import { latestAnalysisResultsBySpecimen } from '@db/latestAnalysisResultsBySpecimen';
import Specimen from '@db/models/Specimen';
import AnalysisResult from '@db/models/AnalysisResult';
import ManualOverride from '@db/models/ManualOverride';
import type { SmartDiagnosisJson } from '@db/models/AnalysisResult';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { formatDateTime } from '@lib/dateTime';
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { AIDisclaimer } from '@features/result-confirmation/components/AIDisclaimer';
import { useConfirmAction } from '@features/result-confirmation/hooks/useConfirmAction';
import { ResultReviewScreen } from '@features/result-confirmation/components/ResultReviewScreen';
import { buildFindingRows, type FindingRow } from '@features/result-confirmation/lib/findingRows';
import {
  getSmartDiagnosisState,
  SMART_DIAGNOSIS_MESSAGES,
} from '@features/result-confirmation/lib/smartDiagnosisState';
import { confirmRetake } from '@features/image-retake/lib/confirmRetake';
import { startAnalysis } from '@features/queue/lib/startAnalysis';
import { getSampleActions, getSampleStatusLabel } from '@features/queue/lib/sampleState';
import type { QueueItem } from '@features/queue/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * @description Adapts a Specimen model to the Queue's QueueItem shape so this screen can
 * reuse Queue's status/action helpers. Doesn't derive isReturnedForCorrection here — it
 * reads the loaded analysis result directly.
 * @param s - WatermelonDB Specimen model instance.
 */
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

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps): React.JSX.Element {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  HIGH: { bg: colors.red100, text: colors.red700 },
  MODERATE: { bg: colors.amber100, text: colors.amber800 },
  LOW: { bg: colors.emerald100, text: colors.emerald800 },
};
const LEVEL_LABELS: Record<string, string> = { HIGH: 'High', MODERATE: 'Moderate', LOW: 'Low' };
// A condition the engine gave no level for is neither low nor normal — don't dress it as Low.
const UNKNOWN_LEVEL_COLORS = { bg: colors.gray100, text: colors.gray500 };

interface SmartDiagnosisSectionProps {
  diagnosis: SmartDiagnosisJson;
}

function SmartDiagnosisSection({ diagnosis }: SmartDiagnosisSectionProps): React.JSX.Element {
  if (diagnosis.no_significant_indicators) {
    return (
      <View style={styles.noIndicators}>
        <Icon name="checkmark-circle-outline" size={16} color={colors.emerald800} />
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
        const levelColors = (c.level && LEVEL_COLORS[c.level]) || UNKNOWN_LEVEL_COLORS;
        return (
          <View key={c.label} style={styles.diagnosisRow}>
            <Text style={styles.diagnosisCondition}>{c.label}</Text>
            <View style={[styles.levelBadge, { backgroundColor: levelColors.bg }]}>
              <Text style={[styles.levelText, { color: levelColors.text }]}>
                {(c.level && (LEVEL_LABELS[c.level] ?? c.level)) || '—'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

interface AIFindingsSectionProps {
  rows: FindingRow[];
}

function AIFindingsSection({ rows }: AIFindingsSectionProps): React.JSX.Element {
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

/**
 * @description Route entry for /sample/:id. Keyed on the specimen id so switching
 * samples while this tab stays mounted always remounts fresh state.
 */
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

/**
 * @description Sample detail: specimen info, analysis result review, and the actions
 * available at the specimen's current stage (begin analysis, retake, reject).
 */
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

  const handleConfirmResult = useCallback(async (): Promise<void> => {
    if (!analysisResult) return;
    const outcome = await confirmAction(analysisResult);
    if (outcome.status === 'failed') {
      Alert.alert('Confirmation Failed', outcome.message);
    }
  }, [analysisResult, confirmAction]);

  const handleBeginAnalysis = useCallback(async (): Promise<void> => {
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
      } catch (err: unknown) {
        // Local write failed — navigation proceeds regardless.
        console.error('[SampleDetail] failed to record begin-analysis locally', err);
      }
    }

    router.push({
      pathname: '/(medtech)/capture',
      params: { specimenId: specimen.serverId, localSpecimenId: specimenId },
    });
  }, [specimen, specimenId, isOnline, router]);

  const handleRetakeImage = useCallback((): void => {
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
  }, [specimen, specimenId, overrides, analysisResult, router]);

  const handleRejectSpecimen = useCallback((): void => {
    router.push(`/(medtech)/sample/reject/${specimenId}`);
  }, [router, specimenId]);

  const handleBack = useCallback((): void => router.back(), [router]);

  // Route variation: resultId present → mount review screen directly. A specimen
  // that has since been rejected must not be reviewed or confirmed, so it falls
  // through to the regular view, which shows the rejection instead.
  if (resultId && specimen?.status !== 'REJECTED') {
    return <ResultReviewScreen resultId={resultId} specimenId={specimenId} />;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.teal} />
      </SafeAreaView>
    );
  }

  if (notFound || !specimen) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.notFoundText}>Sample not found.</Text>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const priorityColors: Record<string, { bg: string; text: string }> = {
    HIGH: { bg: colors.redTint4, text: colors.redDeep },
    NORMAL: { bg: colors.greenTint2, text: colors.greenDeep },
    LOW: { bg: colors.creamAlt, text: colors.warmGray600 },
    ROUTINE: { bg: colors.greenTint3, text: colors.greenDeep2 },
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
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-back" size={24} color={colors.gray700} />
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
              <Icon name="close-circle" size={16} color={colors.red700} />
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
                <Icon name="analytics-outline" size={16} color={colors.teal} />
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
                <Icon name="eye-outline" size={16} color={colors.teal} />
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
                <Icon name="close-circle-outline" size={18} color={colors.red700} />
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
                <Icon name="alert-circle" size={18} color={colors.amber800} />
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
                <Icon name="warning" size={18} color={colors.red700} />
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
                      <ActivityIndicator size="small" color={colors.white} />
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
                <Icon name="time-outline" size={16} color={colors.blue800} />
                <Text style={styles.pendingText}>Awaiting supervisor review.</Text>
              </View>
            )}

            {/* Approved by supervisor */}
            {isApproved && (
              <View style={styles.approvedBanner}>
                <Icon name="checkmark-circle" size={18} color={colors.emerald800} />
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
                <Icon name="send" size={16} color={colors.emerald800} />
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
  safe: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream },
  scroll: { padding: spacing.lg, paddingBottom: spacing.huge },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.smd,
    backgroundColor: colors.cream,
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
    ...typography.titleLg,
    color: colors.ink,
  },

  // Specimen header
  cardHeader: { marginBottom: spacing.lg },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sampleUid: {
    fontFamily: 'Courier',
    ...typography.caption,
    color: colors.warmGray500,
    letterSpacing: 0.5,
  },
  priorityBadge: {
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  priorityText: { ...typography.caption, fontWeight: fontWeight.medium },
  patientName: {
    fontSize: 24,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
    marginTop: spacing.xxs,
  },

  // Cards
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.smd,
  },
  detailLabel: { ...typography.bodyLg, color: colors.warmGray500 },
  detailValue: {
    ...typography.bodyLg,
    fontWeight: fontWeight.medium,
    color: colors.ink,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.lg,
  },
  divider: { height: 0.5, backgroundColor: 'rgba(0,0,0,0.08)' },

  // Analysis results section
  resultsSection: { marginBottom: spacing.md },
  sectionTitle: {
    ...typography.titleLg,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    marginBottom: spacing.smd,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionSubTitle: {
    ...typography.label,
    color: colors.gray700,
  },
  emptyResultText: { ...typography.body, color: colors.gray500, lineHeight: 18 },

  // Smart diagnosis
  diagnosisRows: { gap: spacing.sm },
  diagnosisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diagnosisCondition: {
    ...typography.bodyLg,
    color: colors.ink,
    textTransform: 'capitalize',
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  levelText: { ...typography.micro, fontWeight: fontWeight.bold },
  noIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noIndicatorsText: { ...typography.body, color: colors.emerald800 },

  // AI findings
  findingsRows: { gap: spacing.sm },
  findingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  findingDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.teal,
  },
  findingNameBlock: { flex: 1, gap: spacing.xxs },
  findingName: { ...typography.body, color: colors.gray700 },
  findingCount: { ...typography.body, fontWeight: fontWeight.bold, color: colors.ink },
  // Same look as the override badge on the review screen's parameter rows.
  overriddenBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.violet100,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.xs,
  },
  overriddenBadgeText: { ...typography.micro, fontWeight: fontWeight.medium, color: colors.violet800 },

  // Retake + Confirm row
  resultActions: { gap: spacing.smd, marginTop: spacing.xs },
  retakeBtn: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.lg,
    paddingVertical: spacing.mlg,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  retakeBtnText: { ...typography.subtitle, fontWeight: fontWeight.semibold, color: colors.gray700 },
  confirmBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.lg,
    paddingVertical: spacing.mlg,
    alignItems: 'center',
  },
  confirmBtnText: { ...typography.subtitle, fontWeight: fontWeight.bold, color: colors.white },

  // Shared banner layout
  bannerTextBlock: { flex: 1, gap: spacing.xxs },

  // Awaiting supervisor review
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.blue50,
    borderWidth: 1,
    borderColor: colors.blue200,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  pendingText: { ...typography.body, fontWeight: fontWeight.medium, color: colors.blue800, flex: 1 },

  // Approved by supervisor
  approvedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.smd,
    backgroundColor: colors.emerald50,
    borderWidth: 1,
    borderColor: colors.emerald200,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  approvedTitle: { ...typography.body, fontWeight: fontWeight.bold, color: colors.emerald800 },
  approvedBody: { ...typography.caption, color: colors.emerald700, lineHeight: 17 },

  // Released to patient
  releasedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.smd,
    backgroundColor: colors.green50,
    borderWidth: 1,
    borderColor: colors.green200,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },

  // Returned for correction
  correctionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.smd,
    backgroundColor: colors.amber50,
    borderWidth: 1,
    borderColor: colors.amber200,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.smd,
  },
  correctionTitle: { ...typography.body, fontWeight: fontWeight.bold, color: colors.amber800 },
  correctionBody: { ...typography.caption, color: colors.amber700, lineHeight: 17 },

  // Escalated by the supervisor
  escalatedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.smd,
    backgroundColor: colors.red50,
    borderWidth: 1,
    borderColor: colors.red200,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  escalatedTitle: { ...typography.body, fontWeight: fontWeight.bold, color: colors.red700 },
  escalatedBody: { ...typography.caption, color: colors.red800, lineHeight: 17 },

  // Specimen rejected, result left behind
  rejectedResultBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.smd,
    backgroundColor: colors.red50,
    borderWidth: 1,
    borderColor: colors.red200,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  rejectedResultTitle: { ...typography.body, fontWeight: fontWeight.bold, color: colors.red700 },
  rejectedResultBody: { ...typography.caption, color: colors.red800, lineHeight: 17 },

  // Action buttons
  actions: { gap: spacing.smd, marginTop: spacing.xs },
  actionBtn: {
    borderRadius: radius.lg,
    paddingVertical: spacing.mlg,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBtnPrimary: { backgroundColor: colors.teal, borderColor: colors.teal },
  actionBtnPrimaryText: { ...typography.title, color: colors.white },
  actionBtnDanger: { backgroundColor: colors.red50, borderColor: colors.red200 },
  actionBtnDangerText: { ...typography.title, color: colors.red700 },

  // Rejection card
  rejectionCard: {
    backgroundColor: colors.red50,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    borderColor: colors.red200,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rejectionTitle: {
    ...typography.label,
    color: colors.red700,
  },

  // Not found
  notFoundText: { fontSize: 17, color: colors.warmGray600, marginBottom: spacing.lg },
  backBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.smd,
    backgroundColor: colors.blueAlt,
    borderRadius: radius.sm,
  },
  backBtnText: { color: colors.white, fontWeight: fontWeight.medium },
});
