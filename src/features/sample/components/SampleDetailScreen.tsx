import { useCallback } from 'react';
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
import { useRouter } from 'expo-router';

import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { DEFAULT_MIN_FIELDS } from '@lib/constants/fieldCapture.constant';
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { AIDisclaimer } from '@features/result-confirmation/components/AIDisclaimer';
import { useConfirmAction } from '@features/result-confirmation/hooks/useConfirmAction';
import { ResultReviewScreen } from '@features/result-confirmation/components/ResultReviewScreen';
import { buildFindingRows } from '@features/result-confirmation/lib/findingRows';
import {
  getSmartDiagnosisState,
  SMART_DIAGNOSIS_MESSAGES,
} from '@features/result-confirmation/lib/smartDiagnosisState';
import { confirmRetake } from '@features/image-retake/lib/confirmRetake';
import { startAnalysis } from '@features/queue/lib/startAnalysis';
import { getSampleActions } from '@features/queue/lib/sampleState';

import { SAMPLE_TEXT } from '../constants/sampleText.constant';
import { useSampleDetail } from '../hooks/useSampleDetail';
import { AIFindingsSection } from './AIFindingsSection';
import { AwaitingWebVerificationCard } from './AwaitingWebVerificationCard';
import { CapturingFieldsCard } from './CapturingFieldsCard';
import { RejectionDetailsCard } from './RejectionDetailsCard';
import { ResultStatusBanner } from './ResultStatusBanner';
import { SampleActionBar } from './SampleActionBar';
import { SampleDetailShell } from './SampleDetailShell';
import { SampleResultActions } from './SampleResultActions';
import { SmartDiagnosisSection } from './SmartDiagnosisSection';
import { SpecimenSummaryCard } from './SpecimenSummaryCard';

export interface SampleDetailScreenProps {
  specimenId: string;
  resultId?: string;
  isReadOnly?: boolean;
}

/**
 * @description Sample detail: specimen info, analysis result review, and the actions
 * available at the specimen's current stage (begin analysis, retake, reject).
 * @param props - Sample identifiers and the read-only mode used by Reports.
 */
export function SampleDetailScreen({
  specimenId,
  resultId,
  isReadOnly = false,
}: SampleDetailScreenProps): React.JSX.Element {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { specimen, analysisResult, overrides, isLoading, notFound } = useSampleDetail(specimenId);

  const { confirmResult: confirmAction, isConfirming } = useConfirmAction();

  const handleConfirmResult = useCallback(async (): Promise<void> => {
    if (isReadOnly || !analysisResult) return;
    const outcome = await confirmAction(analysisResult);
    if (outcome.status === 'failed') {
      Alert.alert(SAMPLE_TEXT.confirmationFailedTitle, outcome.message);
    }
  }, [isReadOnly, analysisResult, confirmAction]);

  const handleBeginAnalysis = useCallback(async (): Promise<void> => {
    if (isReadOnly) return;
    if (!specimen?.serverId) {
      Alert.alert(SAMPLE_TEXT.notSyncedTitle, SAMPLE_TEXT.specimenNotSyncedMessage);
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
          Alert.alert(SAMPLE_TEXT.cannotBeginAnalysisTitle, outcome.message);
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
  }, [isReadOnly, specimen, specimenId, isOnline, router]);

  const handleRetakeImage = useCallback((): void => {
    if (isReadOnly) return;
    if (!specimen?.serverId) {
      Alert.alert(SAMPLE_TEXT.notSyncedTitle, SAMPLE_TEXT.retakeNotSyncedMessage);
      return;
    }
    const serverId = specimen.serverId;

    confirmRetake(Object.keys(overrides).length > 0, (): void => {
      router.push({
        pathname: '/(medtech)/capture',
        params: {
          specimenId: serverId,
          localSpecimenId: specimenId,
          existingImageId: analysisResult?.imageId ?? undefined,
        },
      });
    });
  }, [isReadOnly, specimen, specimenId, overrides, analysisResult, router]);

  const handleRejectSpecimen = useCallback((): void => {
    if (isReadOnly) return;
    router.push(`/(medtech)/sample/reject/${specimenId}`);
  }, [isReadOnly, router, specimenId]);

  const handleContinueCapturing = useCallback((): void => {
    if (isReadOnly || !specimen?.serverId) return;
    router.push({
      pathname: '/(medtech)/capture',
      params: { specimenId: specimen.serverId, localSpecimenId: specimenId },
    });
  }, [isReadOnly, specimen, specimenId, router]);

  const handleBack = useCallback((): void => router.back(), [router]);

  // Multi-field workflow (SDD Module 2 proposal): a result only ever gets a
  // fieldCount once it's gone through the capture flow; null/0 means either no
  // result yet or a legacy single-image one, which this screen (and
  // ResultReviewScreen) continues to handle exactly as before.
  const resultStatusValue = analysisResult?.status ?? null;
  const isMultiFieldResult = (analysisResult?.fieldCount ?? 0) > 0;
  const isCapturingFields = resultStatusValue === 'CAPTURING';
  const isAwaitingWebVerification =
    isMultiFieldResult &&
    (resultStatusValue === 'PENDING_CONFIRM' || resultStatusValue === 'RETURNED_FOR_CORRECTION');

  // Reports stay in the read-only detail view even when their result is editable.
  // Other entry points open the shared review once a route or synced specimen has a
  // result, unless the specimen has been rejected or the result is multi-field and
  // still CAPTURING or awaiting a web check — neither has anything for this screen
  // (confirm/retake/override) to offer.
  const reviewResultId = resultId ?? analysisResult?.serverId;
  const canShowReview =
    !isReadOnly &&
    !isLoading &&
    specimen &&
    reviewResultId &&
    specimen.status !== 'REJECTED' &&
    !isCapturingFields &&
    !isAwaitingWebVerification;
  if (canShowReview) {
    return (
      <ResultReviewScreen
        key={reviewResultId}
        resultId={reviewResultId}
        specimenId={specimenId}
        specimen={specimen}
      />
    );
  }

  const canShowCapturingFields =
    !isReadOnly && !isLoading && specimen && specimen.status !== 'REJECTED' && isCapturingFields;
  if (canShowCapturingFields) {
    return (
      <SampleDetailShell specimen={specimen} resultStatus={resultStatusValue} onBack={handleBack}>
        <CapturingFieldsCard
          acceptedCount={analysisResult?.fieldCount ?? 0}
          minFields={DEFAULT_MIN_FIELDS}
        />
        <SampleActionBar
          canBeginAnalysis={false}
          canContinueCapturing
          canReject={getSampleActions(specimen.status, resultStatusValue).canReject}
          isProcessing
          onBeginAnalysis={(): void => undefined}
          onContinueCapturing={handleContinueCapturing}
          onReject={handleRejectSpecimen}
        />
      </SampleDetailShell>
    );
  }

  const canShowAwaitingWebVerification =
    !isReadOnly &&
    !isLoading &&
    specimen &&
    specimen.status !== 'REJECTED' &&
    isAwaitingWebVerification;
  if (canShowAwaitingWebVerification) {
    return (
      <SampleDetailShell specimen={specimen} resultStatus={resultStatusValue} onBack={handleBack}>
        <AwaitingWebVerificationCard returnReason={analysisResult?.returnReason} />
        <SampleActionBar
          canBeginAnalysis={false}
          canReject={getSampleActions(specimen.status, resultStatusValue).canReject}
          isProcessing
          onBeginAnalysis={(): void => undefined}
          onReject={handleRejectSpecimen}
        />
      </SampleDetailShell>
    );
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
        <Text style={styles.notFoundText}>{SAMPLE_TEXT.notFound}</Text>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{SAMPLE_TEXT.goBack}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
    : 'PREVIEW_UNAVAILABLE';
  const findingRows = buildFindingRows(analysisResult?.aiFindings ?? {}, overrides);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBackBtn}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={SAMPLE_TEXT.goBack}
        >
          <Icon name="chevron-back" size={24} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} accessibilityRole="header">
          {SAMPLE_TEXT.detailTitle}
        </Text>
        <View style={styles.topBackBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isReadOnly && <Text style={styles.emptyResultText}>{SAMPLE_TEXT.readOnlyReport}</Text>}
        <SpecimenSummaryCard specimen={specimen} resultStatus={resultStatus} />

        {isRejected && <RejectionDetailsCard specimen={specimen} />}

        {analysisResult && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>{SAMPLE_TEXT.analysisResultsTitle}</Text>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Icon name="analytics-outline" size={16} color={colors.teal} />
                <Text style={styles.sectionSubTitle}>{SAMPLE_TEXT.smartDiagnosisSectionTitle}</Text>
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

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Icon name="eye-outline" size={16} color={colors.teal} />
                <Text style={styles.sectionSubTitle}>{SAMPLE_TEXT.aiFindingsSectionTitle}</Text>
              </View>
              {findingRows.length > 0 ? (
                <AIFindingsSection rows={findingRows} />
              ) : (
                <Text style={styles.emptyResultText}>{SAMPLE_TEXT.noParticlesDetected}</Text>
              )}
            </View>

            <AIDisclaimer />

            {isRejected && (
              <ResultStatusBanner
                variant="rejected"
                title={SAMPLE_TEXT.specimenRejectedTitle}
                body={SAMPLE_TEXT.specimenRejectedBody}
              />
            )}

            {isReturnedForCorrection && (
              <ResultStatusBanner
                variant="correction"
                title={SAMPLE_TEXT.returnedForCorrectionTitle}
                body={SAMPLE_TEXT.returnedForCorrectionBody}
              />
            )}

            {isEscalated && (
              <ResultStatusBanner
                variant="escalated"
                title={SAMPLE_TEXT.criticalEscalatedTitle}
                body={SAMPLE_TEXT.criticalEscalatedBody}
              />
            )}

            {!isReadOnly && (
              <SampleResultActions
                canConfirm={actions.canConfirm}
                canRetake={actions.canRetake}
                isConfirming={isConfirming}
                onConfirm={handleConfirmResult}
                onRetake={handleRetakeImage}
              />
            )}

            {isPendingApproval && (
              <ResultStatusBanner
                variant="pending"
                title={SAMPLE_TEXT.awaitingSupervisorReviewTitle}
              />
            )}

            {isApproved && (
              <ResultStatusBanner
                variant="approved"
                title={SAMPLE_TEXT.approvedBySupervisorTitle}
                body={SAMPLE_TEXT.approvedBySupervisorBody}
              />
            )}

            {isReleased && (
              <ResultStatusBanner
                variant="released"
                title={SAMPLE_TEXT.resultReleasedTitle}
                body={SAMPLE_TEXT.resultReleasedBody}
              />
            )}
          </View>
        )}

        {!isReadOnly && (
          <SampleActionBar
            canBeginAnalysis={actions.canBeginAnalysis}
            canReject={actions.canReject}
            isProcessing={specimen.status === 'PROCESSING'}
            onBeginAnalysis={handleBeginAnalysis}
            onReject={handleRejectSpecimen}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream,
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.huge },

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

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },

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

  notFoundText: { fontSize: 17, color: colors.warmGray600, marginBottom: spacing.lg },
  backBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.smd,
    backgroundColor: colors.blueAlt,
    borderRadius: radius.sm,
  },
  backBtnText: { color: colors.white, fontWeight: fontWeight.medium },
});
