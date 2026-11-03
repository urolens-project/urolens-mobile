import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { AIDisclaimer } from '@features/result-confirmation/components/AIDisclaimer';
import { SmartDiagnosisRows } from '@features/result-confirmation/components/SmartDiagnosisRows';
import { mapSmartDiagnosis } from '@features/result-confirmation/mappers/resultReview.mapper';

import { DetectionOverlay } from './DetectionOverlay';
import { FIELD_CAPTURE_TEXT } from '../constants/fieldCaptureText.constant';
import type { CapturedField } from '../types';

export interface FieldResultScreenProps {
  field: CapturedField;
  isSubmitting: boolean;
  errorMessage: string | null;
  onProceed: () => void;
  onDiscard: () => void;
  /** Other fields still needing a decision, for the step-through's "N more waiting"
   * header (mobile-n8-todo-rem.md C6) — only set when this field was opened from the
   * list; omitted for a field just captured in a live session, which has no backlog. */
  remainingCount?: number;
}

/**
 * @description Shows one just-captured field with its AI boxes, counts and Smart
 * Diagnosis preview, and asks the MedTech to Proceed (accept it into the field
 * list) or Discard it. No override or annotation editing here — correction is a
 * web-only action (SDD Module 2 proposal, section 3.4).
 */
export function FieldResultScreen({
  field,
  isSubmitting,
  errorMessage,
  onProceed,
  onDiscard,
  remainingCount,
}: FieldResultScreenProps): React.JSX.Element {
  const counts = Object.entries(field.aiFindings).filter(([, count]) => count > 0);
  // The overlay's boxes are percentages of the stored image, so the wrapper must
  // match that image's own aspect ratio — a fixed square letterboxes a 4:3 photo
  // and shifts every box vertically (mobile PR #55 review, 3.2). Fall back to 4:3
  // while either dimension is unknown (a PENDING_UPLOAD placeholder has 0, 0).
  const imageAspectRatio =
    field.imageWidth > 0 && field.imageHeight > 0 ? field.imageWidth / field.imageHeight : 4 / 3;
  // An already-ACCEPTED field reopened from the list (mobile PR #55 review, 3.7) has
  // nothing left to Proceed on — only Discard applies.
  const isReadOnly = field.status === 'ACCEPTED';
  // A field still awaiting its boxes (1.2/3.14) hides Proceed too, so nobody
  // decides a field blind — Discard can stay.
  const canProceed = !isReadOnly && !field.isAwaitingBoxes;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{FIELD_CAPTURE_TEXT.fieldResultTitle(field.fieldNo)}</Text>
        <Text style={styles.counterText}>
          {FIELD_CAPTURE_TEXT.fieldCounterLabel(field.acceptedFieldCount, field.minFields)}
          {!!remainingCount &&
            remainingCount > 0 &&
            ` · ${FIELD_CAPTURE_TEXT.moreFieldsWaitingLabel(remainingCount)}`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {field.isAwaitingBoxes ? (
          <View
            style={[styles.imageWrapper, styles.awaitingBoxes, { aspectRatio: imageAspectRatio }]}
          >
            <Text style={styles.awaitingBoxesText}>
              {FIELD_CAPTURE_TEXT.boxesAwaitingSyncMessage}
            </Text>
          </View>
        ) : (
          <View style={[styles.imageWrapper, { aspectRatio: imageAspectRatio }]}>
            <Image
              source={{ uri: field.localImageUri }}
              style={styles.image}
              resizeMode="contain"
            />
            <DetectionOverlay detections={field.detections} />
          </View>
        )}

        <View style={styles.countsSection}>
          {counts.map(([particleType, count]) => (
            <View key={particleType} style={styles.countRow}>
              <Text style={styles.countLabel}>{particleType}</Text>
              <Text style={styles.countValue}>{count}</Text>
            </View>
          ))}
          {counts.length === 0 && (
            <Text style={styles.emptyCountsText}>No particles detected.</Text>
          )}
        </View>

        <SmartDiagnosisPreview field={field} />

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Icon name="alert-circle-outline" size={14} color={colors.red700} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.discardBtn]}
          onPress={onDiscard}
          disabled={isSubmitting}
          testID="discard-field-button"
        >
          <Icon name="trash-outline" size={18} color={colors.gray700} />
          <Text style={styles.discardLabel}>{FIELD_CAPTURE_TEXT.discardLabel}</Text>
        </TouchableOpacity>
        {canProceed && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.proceedBtn]}
            onPress={onProceed}
            disabled={isSubmitting}
            testID="proceed-field-button"
          >
            <Icon name="checkmark-circle-outline" size={18} color={colors.white} />
            <Text style={styles.proceedLabel}>{FIELD_CAPTURE_TEXT.proceedLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Private sub-component ──────────────────────────────────────────────────────

function SmartDiagnosisPreview({ field }: { field: CapturedField }): React.JSX.Element {
  if (field.smartDiagnosisUnavailable || !field.smartDiagnosisPreview) {
    return (
      <View style={styles.diagnosisSection}>
        <Text style={styles.diagnosisUnavailableText}>
          {FIELD_CAPTURE_TEXT.smartDiagnosisUnavailableMessage}
        </Text>
      </View>
    );
  }

  const smartDiagnosis = mapSmartDiagnosis(field.smartDiagnosisPreview);

  return (
    <View style={styles.diagnosisSection}>
      <Text style={styles.diagnosisCaption}>{FIELD_CAPTURE_TEXT.thisFieldOnlyCaption}</Text>
      {smartDiagnosis?.noSignificantIndicators ? (
        <View style={styles.noIndicatorsRow}>
          <Icon name="checkmark-circle-outline" size={16} color={colors.emerald800} />
          <Text style={styles.noIndicatorsText}>
            {FIELD_CAPTURE_TEXT.noSignificantDiagnosticIndicators}
          </Text>
        </View>
      ) : (
        <View style={styles.rowsWrapper}>
          <SmartDiagnosisRows smartDiagnosis={smartDiagnosis} isCompact />
        </View>
      )}
      <AIDisclaimer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mlg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gray200,
  },
  title: { ...typography.title, color: colors.gray900 },
  counterText: { ...typography.caption, color: colors.gray500, marginTop: spacing.xs },
  scrollContent: { paddingBottom: spacing.xl },
  imageWrapper: {
    backgroundColor: colors.black,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: 'hidden',
  },
  image: { flex: 1 },
  awaitingBoxes: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  awaitingBoxesText: { ...typography.body, color: colors.gray300, textAlign: 'center' },
  countsSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  countLabel: { ...typography.body, color: colors.gray700 },
  countValue: { ...typography.body, color: colors.gray900, fontWeight: fontWeight.semibold },
  emptyCountsText: { ...typography.body, color: colors.gray500 },
  diagnosisSection: { paddingTop: spacing.lg },
  diagnosisCaption: {
    ...typography.caption,
    color: colors.gray500,
    paddingHorizontal: spacing.lg,
  },
  diagnosisUnavailableText: {
    ...typography.caption,
    color: colors.gray500,
    paddingHorizontal: spacing.lg,
  },
  noIndicatorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  noIndicatorsText: { ...typography.body, color: colors.emerald800 },
  rowsWrapper: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.red100,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.sm,
    padding: spacing.smd,
  },
  errorText: { ...typography.body, color: colors.red700, lineHeight: 18, flex: 1 },
  actions: {
    flexDirection: 'row',
    gap: spacing.smd,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.white,
    borderTopWidth: 0.5,
    borderTopColor: colors.gray200,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  discardBtn: {
    backgroundColor: colors.gray50,
    borderWidth: 0.5,
    borderColor: colors.gray300,
  },
  proceedBtn: { backgroundColor: colors.teal },
  discardLabel: { ...typography.subtitle, fontWeight: fontWeight.semibold, color: colors.gray700 },
  proceedLabel: { ...typography.subtitle, fontWeight: fontWeight.semibold, color: colors.white },
});
