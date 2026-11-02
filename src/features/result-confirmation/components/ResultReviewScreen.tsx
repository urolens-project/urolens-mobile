import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNetworkStatus } from '@hooks/useNetworkStatus';
import type { ResultStatus } from '@app-types/enums';
import { colors, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';
import { OfflineBanner } from '@components/OfflineBanner';

import type { QueueItem } from '@features/queue/types';
import { getSampleActions, getSampleStatusLabel } from '@features/queue/lib/sampleState';

import { RESULT_CONFIRMATION_TEXT } from '../constants/resultConfirmationText.constant';
import { useResultConfirmation } from '../hooks/useResultConfirmation';
import { useResultReviewDetail } from '../hooks/useResultReviewDetail';
import { useResultReviewActions } from '../hooks/useResultReviewActions';
import { mapSmartDiagnosis } from '../mappers/resultReview.mapper';
import { getSmartDiagnosisState, SMART_DIAGNOSIS_MESSAGES } from '../lib/smartDiagnosisState';
import { AIDisclaimer } from './AIDisclaimer';
import { AIFindingsPanel } from './ai-findings-panel';
import { ResultImagePanel } from './ResultImagePanel';
import { ResultPatientSummary } from './ResultPatientSummary';
import { ResultReviewActionBar } from './ResultReviewActionBar';
import { ResultReviewTitleBar } from './ResultReviewTitleBar';
import { ReviewResultStatus } from './ReviewResultStatus';
import { SmartDiagnosisPanel } from './SmartDiagnosisPanel';

export interface ResultReviewScreenProps {
  resultId: string;
  specimenId: string;
  specimen?: QueueItem;
}

/**
 * @description Read-only review of patient context, the microscopy image and AI findings for
 * a result past the MedTech's own sign-off — confirming, retaking and overriding now happen on
 * the website (mobile PR #55 review, #3).
 * @param resultId - Server result identifier.
 * @param specimenId - Local specimen identifier used by the queue and capture flow.
 * @param specimen - Optional local patient/sample context for offline review.
 */
export function ResultReviewScreen({
  resultId,
  specimenId,
  specimen,
}: ResultReviewScreenProps): React.JSX.Element {
  const { isOnline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const { result, aiFindings, isLoading } = useResultConfirmation(resultId);
  const localRevision = result
    ? JSON.stringify([
        result.status,
        result.imageId,
        result.aiFindingsJson,
        result.smartDiagnosisJson,
        result.smartDiagnosisUnavailable,
        result.isSynced,
      ])
    : undefined;
  const {
    detail,
    isLoading: isDetailLoading,
    error: detailError,
    refresh,
  } = useResultReviewDetail(resultId, localRevision);
  // A multi-field submission queued offline (useSubmitFields) — the result is
  // already PENDING_SUPERVISOR_APPROVAL locally before the next sync confirms it.
  const isQueuedSubmission = result?.status === 'PENDING_SUPERVISOR_APPROVAL' && !result.isSynced;
  const status = isQueuedSubmission ? result.status : (detail?.status ?? result?.status ?? '');
  // Confirm, Retake and Override all moved to the website (mobile PR #55 review,
  // #3): PENDING_CONFIRM/RETURNED_FOR_CORRECTION/IMAGE_RETAKE_REQUESTED/FAILED
  // never reach this screen (SampleDetailScreen routes them to "Continue on the
  // website" instead), so every status rendered here is already read-only.
  const subtitle = getSampleStatusLabel(
    specimen?.status ?? 'PROCESSING',
    status as `${ResultStatus}`,
  );
  const canReject =
    !!specimen && getSampleActions(specimen.status, status as `${ResultStatus}`).canReject;
  const smartDiagnosis =
    detail?.smartDiagnosis ?? mapSmartDiagnosis(result?.smartDiagnosis ?? null);
  const isDiagnosisUnavailable =
    detail?.smartDiagnosisUnavailable ?? result?.smartDiagnosisUnavailable ?? false;

  const { handleBack, handleReject } = useResultReviewActions({
    specimenId,
    canReject,
  });

  if (isLoading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator testID="loading" size="large" color={colors.teal} />
      </View>
    );
  if (!result)
    return (
      <View style={styles.centered}>
        <Icon name="document-outline" color={colors.warmGray200} />
        <Text style={styles.title}>{RESULT_CONFIRMATION_TEXT.resultNotFound.title}</Text>
        <Text style={styles.body}>{RESULT_CONFIRMATION_TEXT.resultNotFound.body}</Text>
        <Pressable accessibilityRole="button" onPress={handleBack}>
          <Text style={styles.link}>{RESULT_CONFIRMATION_TEXT.backToQueueLabel}</Text>
        </Pressable>
      </View>
    );
  const diagnosisState = getSmartDiagnosisState({
    status: status as `${ResultStatus}`,
    smartDiagnosis,
    unavailable: isDiagnosisUnavailable,
    isSynced: result.isSynced,
  });
  const diagnosisMessage =
    diagnosisState === 'READY' ? undefined : SMART_DIAGNOSIS_MESSAGES[diagnosisState];

  return (
    <View style={styles.container}>
      {!isOnline && <OfflineBanner />}
      <ResultReviewTitleBar
        topInset={insets.top}
        isConfirmed
        subtitle={subtitle}
        onBack={handleBack}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            accessibilityLabel={RESULT_CONFIRMATION_TEXT.refreshAccessibilityLabel}
            refreshing={isDetailLoading}
            tintColor={colors.teal}
            colors={[colors.teal]}
            onRefresh={(): void => void refresh()}
          />
        }
      >
        <AIDisclaimer />
        <ResultPatientSummary detail={detail} specimen={specimen} />
        <View style={styles.status}>
          <ReviewResultStatus
            status={status}
            returnReason={detail?.returnReason ?? null}
            isDetailAvailable={!!detail}
          />
        </View>
        {isDetailLoading && (
          <ActivityIndicator
            color={colors.teal}
            accessibilityLabel={RESULT_CONFIRMATION_TEXT.loadingAccessibilityLabel}
          />
        )}
        {detailError && (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {detailError.message}
          </Text>
        )}
        <ResultImagePanel key={detail?.imageUrl} imageUrl={detail?.imageUrl ?? null} />
        <AIFindingsPanel resultId={resultId} findings={detail?.aiFindings ?? aiFindings} />
        <SmartDiagnosisPanel
          smartDiagnosis={smartDiagnosis}
          unavailable={isDiagnosisUnavailable}
          emptyMessage={diagnosisMessage}
          isPreview={isQueuedSubmission}
        />
        {canReject && (
          <Pressable style={styles.rejectButton} accessibilityRole="button" onPress={handleReject}>
            <Text style={styles.rejectButtonText}>
              {RESULT_CONFIRMATION_TEXT.rejectSpecimenLabel}
            </Text>
          </Pressable>
        )}
      </ScrollView>
      <ResultReviewActionBar bottomInset={insets.bottom} onContinue={handleBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
    gap: spacing.sm,
    padding: spacing.xxl,
  },
  title: { ...typography.title, color: colors.ink },
  body: { ...typography.bodyLg, color: colors.gray500 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.jumbo * 3 },
  status: { marginHorizontal: spacing.lg },
  link: { ...typography.label, color: colors.teal, padding: spacing.lg },
  rejectButton: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    paddingVertical: spacing.mlg,
    alignItems: 'center',
    backgroundColor: colors.red50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.red200,
  },
  rejectButtonText: { ...typography.title, color: colors.red700 },
  errorText: { ...typography.body, color: colors.red700, padding: spacing.lg },
});
