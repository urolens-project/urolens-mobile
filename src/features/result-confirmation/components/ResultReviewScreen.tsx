import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNetworkStatus } from '@hooks/useNetworkStatus';
import type { ResultStatus } from '@app-types/enums';
import { colors, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';
import { OfflineBanner } from '@components/OfflineBanner';

import type { QueueItem } from '@features/queue/types';
import { getSampleActions, getSampleStatusLabel } from '@features/queue/lib/sampleState';

import { useResultAnnotations } from '../hooks/useResultAnnotations';
import { useResultConfirmation } from '../hooks/useResultConfirmation';
import { useResultReviewDetail } from '../hooks/useResultReviewDetail';
import { useResultReviewActions } from '../hooks/useResultReviewActions';
import { mapSmartDiagnosis } from '../mappers/resultReview.mapper';
import { AIDisclaimer } from './AIDisclaimer';
import { AIFindingsPanel } from './AIFindingsPanel';
import { ResultAnnotationPanel } from './ResultAnnotationPanel';
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
 * @description Reviews patient context, the microscopy image and AI findings, and saves corrections before submission.
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
  const { result, aiFindings, isLoading, isConfirming, error, confirmResult } =
    useResultConfirmation(resultId);
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
  const annotations = useResultAnnotations(detail);
  const isQueuedSubmission = result?.status === 'PENDING_SUPERVISOR_APPROVAL' && !result.isSynced;
  const status = isQueuedSubmission ? result.status : (detail?.status ?? result?.status ?? '');
  const canEdit = status === 'PENDING_CONFIRM' || status === 'RETURNED_FOR_CORRECTION';
  const isReturned = status === 'RETURNED_FOR_CORRECTION';
  const isBusy = isConfirming || annotations.isSaving;
  const isConfirmed = !canEdit;
  let subtitle = 'Pending your confirmation';
  if (isReturned) subtitle = 'Returned for Correction';
  else if (isConfirmed)
    subtitle = getSampleStatusLabel(specimen?.status ?? 'PROCESSING', status as `${ResultStatus}`);
  const canReject =
    !!specimen && getSampleActions(specimen.status, status as `${ResultStatus}`).canReject;
  const smartDiagnosis =
    detail?.smartDiagnosis ?? mapSmartDiagnosis(result?.smartDiagnosis ?? null);
  const isDiagnosisUnavailable =
    detail?.smartDiagnosisUnavailable ?? result?.smartDiagnosisUnavailable ?? false;

  const { handleBack, handleOverride, handleReject, handleRetake, handleConfirm } =
    useResultReviewActions({
      resultId,
      specimenId,
      result,
      isOnline,
      isBusy,
      canEdit,
      canReject,
      isReturned,
      isDirty: annotations.isDirty,
      saveBeforeConfirm: annotations.saveBeforeConfirm,
      saveAnnotations: annotations.save,
      confirmResult,
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
        <Text style={styles.title}>Result not found</Text>
        <Text style={styles.body}>This result may not have synced yet.</Text>
        <Pressable accessibilityRole="button" onPress={handleBack}>
          <Text style={styles.link}>Back to Confirmation Queue</Text>
        </Pressable>
      </View>
    );
  let diagnosisMessage: string | undefined;
  if (!isDiagnosisUnavailable) {
    if (canEdit) diagnosisMessage = 'Smart Diagnosis is generated after you confirm this result.';
    else if (!result.isSynced)
      diagnosisMessage =
        'Your confirmation is queued. Smart Diagnosis will appear once this device syncs.';
    else
      diagnosisMessage =
        'Smart Diagnosis is not available for this sample. Try reloading the result.';
  }

  return (
    <View style={styles.container}>
      {!isOnline && <OfflineBanner />}
      <ResultReviewTitleBar
        topInset={insets.top}
        isConfirmed={isConfirmed}
        subtitle={subtitle}
        onBack={handleBack}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
            accessibilityLabel="Loading image and annotations"
          />
        )}
        {detailError && (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {detailError.message}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={(): void => {
            void refresh();
          }}
          disabled={isBusy || isDetailLoading}
        >
          <Text style={styles.link}>Reload result details</Text>
        </Pressable>
        <ResultAnnotationPanel
          imageUrl={detail?.imageUrl ?? null}
          draft={annotations.draft}
          otherAnnotations={detail?.otherAnnotations ?? []}
          isEditable={canEdit && !!detail && !isBusy}
          isDirty={annotations.isDirty}
          isSaving={annotations.isSaving}
          error={annotations.error?.message ?? null}
          onNotesChange={annotations.setNotes}
          onBoxesChange={annotations.setBoxes}
          onSave={(): void => {
            void annotations.save();
          }}
        />
        <AIFindingsPanel
          resultId={resultId}
          findings={detail?.aiFindings ?? aiFindings}
          onOverride={handleOverride}
          isConfirmed={!canEdit || isBusy}
        />
        <SmartDiagnosisPanel
          smartDiagnosis={smartDiagnosis}
          unavailable={isDiagnosisUnavailable}
          emptyMessage={diagnosisMessage}
        />
        {canReject && (
          <Pressable accessibilityRole="button" disabled={isBusy} onPress={handleReject}>
            <Text style={styles.link}>Reject Specimen</Text>
          </Pressable>
        )}
        {error && (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error}
          </Text>
        )}
      </ScrollView>
      <ResultReviewActionBar
        bottomInset={insets.bottom}
        isOnline={isOnline}
        isConfirmed={isConfirmed}
        isConfirming={isBusy}
        isReturned={isReturned}
        onRetake={handleRetake}
        onConfirm={handleConfirm}
        onContinue={handleBack}
      />
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
  errorText: { ...typography.body, color: colors.red700, padding: spacing.lg },
});
