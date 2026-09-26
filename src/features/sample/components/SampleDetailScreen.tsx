import { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useNetworkStatus } from '@hooks/useNetworkStatus';
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

import { useSampleDetail } from '../hooks/useSampleDetail';
import { AIFindingsSection } from './AIFindingsSection';
import { RejectionDetailsCard } from './RejectionDetailsCard';
import { ResultStatusBanner } from './ResultStatusBanner';
import { SampleActionBar } from './SampleActionBar';
import { SampleResultActions } from './SampleResultActions';
import { SmartDiagnosisSection } from './SmartDiagnosisSection';
import { SpecimenSummaryCard } from './SpecimenSummaryCard';

export interface SampleDetailScreenProps {
  specimenId: string;
  resultId?: string;
}

/**
 * @description Sample detail: specimen info, analysis result review, and the actions
 * available at the specimen's current stage (begin analysis, retake, reject).
 */
export function SampleDetailScreen({
  specimenId,
  resultId,
}: SampleDetailScreenProps): React.JSX.Element {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { specimen, analysisResult, overrides, isLoading, notFound } = useSampleDetail(specimenId);

  const { confirmResult: confirmAction, isConfirming } = useConfirmAction();

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
        <SpecimenSummaryCard specimen={specimen} resultStatus={resultStatus} />

        {isRejected && <RejectionDetailsCard specimen={specimen} />}

        {analysisResult && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Analysis Results</Text>

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

            {isRejected && (
              <ResultStatusBanner
                variant="rejected"
                title="Specimen Rejected"
                body="This result cannot be confirmed and will not be sent for supervisor approval."
              />
            )}

            {isReturnedForCorrection && (
              <ResultStatusBanner
                variant="correction"
                title="Returned for Correction"
                body="The supervisor has returned this result. Please retake the image and re-confirm."
              />
            )}

            {isEscalated && (
              <ResultStatusBanner
                variant="escalated"
                title="Critical / Escalated"
                body="The supervisor has escalated this result for urgent review. No further action is needed from you."
              />
            )}

            <SampleResultActions
              canConfirm={actions.canConfirm}
              canRetake={actions.canRetake}
              isConfirming={isConfirming}
              onConfirm={handleConfirmResult}
              onRetake={handleRetakeImage}
            />

            {isPendingApproval && (
              <ResultStatusBanner variant="pending" title="Awaiting supervisor review." />
            )}

            {isApproved && (
              <ResultStatusBanner
                variant="approved"
                title="Approved by Supervisor"
                body="This result has been reviewed and approved. It is ready for release."
              />
            )}

            {isReleased && (
              <ResultStatusBanner
                variant="released"
                title="Result Released"
                body="This result has been released to the patient."
              />
            )}
          </View>
        )}

        <SampleActionBar
          canBeginAnalysis={actions.canBeginAnalysis}
          canReject={actions.canReject}
          isProcessing={specimen.status === 'PROCESSING'}
          onBeginAnalysis={handleBeginAnalysis}
          onReject={handleRejectSpecimen}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream },
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
