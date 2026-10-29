import { useCallback } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { colors, radius, spacing, typography } from '@src/theme';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

import { Icon } from '@components/Icon';

import { FIELD_CAPTURE_TEXT } from '../constants/fieldCaptureText.constant';
import { useFieldList } from '../hooks/useFieldList';
import { useSubmitFields } from '../hooks/useSubmitFields';
import { getSubmitBlockingReason } from '../lib/submitBlockingReason';
import type { FieldListItem } from '../types';

export interface FieldListScreenProps {
  specimenId: string;
  localSpecimenId: string;
  minFields: number;
}

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
  const { fields, acceptedCount, undecidedCount, resultServerId } = useFieldList(specimenId);
  const { submitFields, isLoading: isSubmitting, error } = useSubmitFields();

  const blockingReason = getSubmitBlockingReason({
    acceptedCount,
    minFields,
    undecidedCount,
    isOnline,
  });

  const handleCaptureMore = useCallback((): void => {
    router.push({
      pathname: '/(medtech)/capture',
      params: { specimenId, localSpecimenId },
    });
  }, [localSpecimenId, specimenId]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!resultServerId || blockingReason) return;
    const ok = await submitFields(resultServerId);
    if (!ok) {
      Alert.alert(
        FIELD_CAPTURE_TEXT.submitFailedTitle,
        error?.message ?? FIELD_CAPTURE_TEXT.uploadFailedFallbackMessage,
      );
      return;
    }
    Alert.alert(FIELD_CAPTURE_TEXT.submitSucceededTitle, FIELD_CAPTURE_TEXT.submitSucceededMessage);
    router.replace('/(medtech)/queue');
  }, [blockingReason, error, resultServerId, submitFields]);

  const handleGoBack = useCallback((): void => {
    router.back();
  }, []);

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
        renderItem={({ item }) => <FieldRow item={item} />}
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
          style={[styles.submitBtn, (!!blockingReason || isSubmitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!!blockingReason || isSubmitting}
          testID="submit-for-verification-button"
        >
          <Text style={styles.submitLabel}>
            {isSubmitting
              ? FIELD_CAPTURE_TEXT.submittingLabel
              : FIELD_CAPTURE_TEXT.submitForVerificationLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Private sub-component ──────────────────────────────────────────────────────

function FieldRow({ item }: { item: FieldListItem }): React.JSX.Element {
  const isDiscarded = item.status === 'DISCARDED';
  return (
    <View style={[styles.row, isDiscarded && styles.rowDiscarded]}>
      {item.thumbnailUri ? (
        <Image source={{ uri: item.thumbnailUri }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
      )}
      <View style={styles.rowDetails}>
        <Text style={styles.rowTitle}>
          Field {item.fieldNo} · {item.magnification}
        </Text>
        <Text style={styles.rowSubtitle}>
          {isDiscarded ? 'Discarded' : `${item.particleCount} particles`}
        </Text>
      </View>
    </View>
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
