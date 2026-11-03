import { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { synchronize } from '@db/sync/syncManager';

import { Icon } from '@components/Icon';

import { FIELD_CAPTURE_TEXT } from '../constants/fieldCaptureText.constant';
import { fetchFieldCounts, useFieldList } from '../hooks/useFieldList';
import { useSubmitFields } from '../hooks/useSubmitFields';
import { getSubmitBlockingReason } from '../lib/submitBlockingReason';
import type { FieldListItem } from '../types';
import { SubmitResultModal } from './SubmitResultModal';

export interface FieldListScreenProps {
  specimenId: string;
  localSpecimenId: string;
  minFields: number;
}

interface SubmitResultState {
  visible: boolean;
  variant: 'success' | 'error';
  title: string;
  message: string;
}

/** Error codes where the phone and server disagree on field state (the server
 * has a field the phone is missing) — sync first so the server's message lines
 * up with what the field list then shows (N8 field-post-analysis-report, Bug 2). */
const SYNC_ON_SUBMIT_ERROR_CODES = new Set(['FIELDS_UNDECIDED', 'FIELDS_BELOW_MINIMUM']);

/**
 * @description Lists a specimen's captured fields with their status, and gates Submit
 * for Verification on the minimum accepted count and no field left undecided — the
 * same two guards the backend enforces (SDD Module 2 proposal, transaction 2.3).
 * @param specimenId - Server specimen id, read live from result_fields.
 * @param localSpecimenId - Local specimen id, passed through to Capture More Fields.
 * @param minFields - Accepted fields required to submit.
 */
export function FieldListScreen({
  specimenId,
  localSpecimenId,
  minFields,
}: FieldListScreenProps): React.JSX.Element {
  const { isOnline } = useNetworkStatus();
  const { fields, acceptedCount, undecidedCount, pendingDecisionsCount, resultServerId } =
    useFieldList(specimenId);
  const { submitFields, isLoading: isSubmitting, getError } = useSubmitFields();
  const [submitResult, setSubmitResult] = useState<SubmitResultState>({
    visible: false,
    variant: 'success',
    title: '',
    message: '',
  });
  const [isPreparingSubmit, setIsPreparingSubmit] = useState(false);

  const blockingReason = getSubmitBlockingReason({
    acceptedCount,
    minFields,
    undecidedCount,
    pendingDecisionsCount,
    isOnline,
  });

  const handleCaptureMore = useCallback((): void => {
    router.push({
      pathname: '/(medtech)/capture',
      params: { specimenId, localSpecimenId },
    });
  }, [localSpecimenId, specimenId]);

  const handleOpenField = useCallback(
    (item: FieldListItem): void => {
      // ACCEPTED opens read-only (Discard only) — see FieldResultScreen's isReadOnly
      // (mobile PR #55 review, 3.7).
      if (item.status !== 'ANALYZED' && item.status !== 'ACCEPTED') return;
      router.push({
        pathname: '/(medtech)/field-result',
        params: { localFieldId: item.localId, specimenId, minFields: String(minFields) },
      });
    },
    [minFields, specimenId],
  );

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!resultServerId || blockingReason || isPreparingSubmit) return;

    // The guard above can be stale (see FieldListScreen's class doc) — the phone only
    // resyncs on app foreground/reconnect/tab mount, not while sitting in this screen.
    // Pull fresh server state and recheck straight from WatermelonDB before risking the
    // submit call, instead of only cleaning up after the server 409s.
    setIsPreparingSubmit(true);
    let freshCounts;
    try {
      await synchronize();
      freshCounts = await fetchFieldCounts(specimenId);
    } catch (syncErr) {
      console.error('[FieldListScreen]', syncErr);
      freshCounts = null;
    } finally {
      setIsPreparingSubmit(false);
    }
    if (!freshCounts) return;
    if (getSubmitBlockingReason({ ...freshCounts, minFields, isOnline })) return;

    const ok = await submitFields(resultServerId);
    if (!ok) {
      const submitError = getError();
      if (submitError?.code && SYNC_ON_SUBMIT_ERROR_CODES.has(submitError.code)) {
        try {
          await synchronize();
        } catch (syncErr) {
          console.error('[FieldListScreen]', syncErr);
        }
      }
      setSubmitResult({
        visible: true,
        variant: 'error',
        title: FIELD_CAPTURE_TEXT.submitFailedTitle,
        message: submitError?.message ?? FIELD_CAPTURE_TEXT.uploadFailedFallbackMessage,
      });
      return;
    }
    setSubmitResult({
      visible: true,
      variant: 'success',
      title: FIELD_CAPTURE_TEXT.submitSucceededTitle,
      message: FIELD_CAPTURE_TEXT.submitSucceededMessage,
    });
  }, [
    blockingReason,
    getError,
    isOnline,
    isPreparingSubmit,
    minFields,
    resultServerId,
    specimenId,
    submitFields,
  ]);

  const handleGoBack = useCallback((): void => {
    router.back();
  }, []);

  const handleDismissSubmitResult = useCallback((): void => {
    const wasSuccess = submitResult.variant === 'success';
    setSubmitResult((prev) => ({ ...prev, visible: false }));
    if (wasSuccess) router.replace('/(medtech)/queue');
  }, [submitResult.variant]);

  const isSubmitDisabled = !!blockingReason || isSubmitting || isPreparingSubmit;
  let submitLabel: string = FIELD_CAPTURE_TEXT.submitForVerificationLabel;
  if (isPreparingSubmit) submitLabel = FIELD_CAPTURE_TEXT.checkingLatestFieldsLabel;
  else if (isSubmitting) submitLabel = FIELD_CAPTURE_TEXT.submittingLabel;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Icon name="chevron-back" size={22} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.title}>{FIELD_CAPTURE_TEXT.fieldListTitle}</Text>
        <Text style={styles.counterText}>
          {FIELD_CAPTURE_TEXT.fieldCounterLabel(acceptedCount, minFields)}
        </Text>
      </View>

      <FlatList
        data={fields}
        keyExtractor={(item) => item.localId}
        renderItem={({ item }) => <FieldRow item={item} onPress={handleOpenField} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{FIELD_CAPTURE_TEXT.emptyFieldListMessage}</Text>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.captureMoreBtn} onPress={handleCaptureMore}>
          <Icon name="camera-outline" size={18} color={colors.gray700} />
          <Text style={styles.captureMoreLabel}>{FIELD_CAPTURE_TEXT.captureMoreLabel}</Text>
        </TouchableOpacity>

        {blockingReason && <Text style={styles.blockingText}>{blockingReason}</Text>}

        <TouchableOpacity
          style={[styles.submitBtn, isSubmitDisabled && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitDisabled}
          testID="submit-for-verification-button"
        >
          <Text style={styles.submitLabel}>{submitLabel}</Text>
        </TouchableOpacity>
      </View>

      <SubmitResultModal
        visible={submitResult.visible}
        variant={submitResult.variant}
        title={submitResult.title}
        message={submitResult.message}
        onDismiss={handleDismissSubmitResult}
      />
    </SafeAreaView>
  );
}

// ── Private sub-component ──────────────────────────────────────────────────────

interface FieldRowProps {
  item: FieldListItem;
  onPress: (item: FieldListItem) => void;
}

function FieldRow({ item, onPress }: FieldRowProps): React.JSX.Element {
  const isDiscarded = item.status === 'DISCARDED';
  const isPendingUpload = item.status === 'PENDING_UPLOAD';
  const isAccepted = item.status === 'ACCEPTED';
  const needsDecision = item.status === 'ANALYZED';
  // ACCEPTED reopens read-only (view-and-Discard) — see FieldResultScreen's
  // isReadOnly (mobile PR #55 review, 3.7).
  const isOpenable = needsDecision || isAccepted;
  const handlePress = useCallback((): void => onPress(item), [item, onPress]);

  let subtitle = `${item.particleCount} particles`;
  if (isDiscarded) subtitle = item.discardReason ?? FIELD_CAPTURE_TEXT.fieldDiscardedLabel;
  else if (isPendingUpload) subtitle = FIELD_CAPTURE_TEXT.fieldWaitingToUploadLabel;
  else if (needsDecision) {
    subtitle = item.isReviewed
      ? FIELD_CAPTURE_TEXT.fieldReviewedPendingDecisionLabel
      : FIELD_CAPTURE_TEXT.fieldNeedsDecisionLabel;
  }

  return (
    <TouchableOpacity
      style={[styles.row, isDiscarded && styles.rowDiscarded]}
      onPress={handlePress}
      disabled={!isOpenable}
      activeOpacity={isOpenable ? 0.7 : 1}
    >
      {item.thumbnailUri ? (
        <Image source={{ uri: item.thumbnailUri }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
      )}
      <View style={styles.rowDetails}>
        <Text style={styles.rowTitle}>
          Field {item.fieldNo} · {item.magnification}
        </Text>
        <Text style={[styles.rowSubtitle, needsDecision && styles.rowSubtitleAttention]}>
          {subtitle}
        </Text>
      </View>
      {isOpenable && <Icon name="chevron-forward" size={18} color={colors.indigo800} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mlg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  backButton: { width: 32, height: 32, justifyContent: 'center' },
  title: { ...typography.title, color: colors.gray900, flex: 1 },
  counterText: { ...typography.body, color: colors.gray500 },
  listContent: { padding: spacing.lg, gap: spacing.sm },
  emptyText: {
    ...typography.body,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.smd,
    borderRadius: radius.lg,
    backgroundColor: colors.gray50,
    marginBottom: spacing.sm,
  },
  rowDiscarded: { opacity: 0.5 },
  thumbnail: { width: 48, height: 48, borderRadius: radius.sm },
  thumbnailPlaceholder: { backgroundColor: colors.gray200 },
  rowDetails: { flex: 1 },
  rowTitle: { ...typography.label, color: colors.gray900 },
  rowSubtitle: { ...typography.caption, color: colors.gray500, marginTop: spacing.xxs },
  rowSubtitleAttention: { color: colors.indigo800, fontWeight: fontWeight.semibold },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
  captureMoreBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.mlg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  captureMoreLabel: { ...typography.subtitle, color: colors.gray700 },
  blockingText: { ...typography.caption, color: colors.amber700, textAlign: 'center' },
  submitBtn: {
    paddingVertical: spacing.mlg,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: colors.teal,
  },
  submitBtnDisabled: { backgroundColor: colors.gray300 },
  submitLabel: { ...typography.label, color: colors.white },
});
