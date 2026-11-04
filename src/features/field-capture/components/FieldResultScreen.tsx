import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { AIDisclaimer } from '@features/result-confirmation/components/AIDisclaimer';
import { SmartDiagnosisRows } from '@features/result-confirmation/components/SmartDiagnosisRows';
import { mapSmartDiagnosis } from '@features/result-confirmation/mappers/resultReview.mapper';

import { DetectionOverlay } from './DetectionOverlay';
import { ParticleLegend } from './ParticleLegend';
import { FIELD_CAPTURE_TEXT } from '../constants/fieldCaptureText.constant';
import { formatParticleName, getParticleColor } from '../lib/particleColor';
import type { CapturedField } from '../types';

export interface FieldResultScreenProps {
  field: CapturedField;
  isSubmitting: boolean;
  errorMessage: string | null;
  onProceed: () => void;
  onDiscard: () => void;
  /** Marks a field still needing a decision as reviewed, without deciding
   * Proceed/Discard — only passed when this field was reopened from the field
   * list; omitted for a field just captured in a live session, which has no
   * separate "come back to this later" backlog to track reviewed state for. */
  onMarkReviewed?: () => void;
  /** Other fields still needing a decision, for the step-through's "N more waiting"
   * header (mobile-n8-todo-rem.md C6) — only set when this field was opened from the
   * list; omitted for a field just captured in a live session, which has no backlog. */
  remainingCount?: number;
  /** Shows a header back button when set — only when this field was reopened from
   * the field list (FieldDetailScreen), which otherwise leaves no way back
   * (field-post-analysis-report.md, Section 2 item 6). Omitted for a field just
   * captured in a live session, where Proceed/Discard are the only ways forward. */
  onGoBack?: () => void;
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
  onMarkReviewed,
  remainingCount,
  onGoBack,
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
  // Only offered for a field reopened from the list that still needs a decision —
  // Mark as Reviewed doesn't replace Proceed/Discard, so submit still blocks on it
  // until one of those is tapped (see submitBlockingReason.ts's undecidedCount).
  const canMarkReviewed = !!onMarkReviewed && field.status === 'ANALYZED' && !field.isReviewed;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {onGoBack && (
          <TouchableOpacity
            onPress={onGoBack}
            style={styles.backButton}
            testID="field-result-back-button"
            accessibilityRole="button"
            accessibilityLabel={FIELD_CAPTURE_TEXT.backToFieldListA11yLabel}
          >
            <Icon name="chevron-back" size={22} color={colors.gray700} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitles}>
          <Text style={styles.title}>{FIELD_CAPTURE_TEXT.fieldResultTitle(field.fieldNo)}</Text>
          <Text style={styles.counterText}>
            {FIELD_CAPTURE_TEXT.fieldCounterLabel(field.acceptedFieldCount, field.minFields)}
            {!!remainingCount &&
              remainingCount > 0 &&
              ` · ${FIELD_CAPTURE_TEXT.moreFieldsWaitingLabel(remainingCount)}`}
          </Text>
        </View>
        {field.status === 'ANALYZED' && field.isReviewed && (
          <View style={styles.reviewedBadge} testID="field-reviewed-badge">
            <Icon name="checkmark-circle-outline" size={14} color={colors.indigo800} />
            <Text style={styles.reviewedBadgeText}>{FIELD_CAPTURE_TEXT.reviewedLabel}</Text>
          </View>
        )}
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
          <>
            <View style={[styles.imageWrapper, { aspectRatio: imageAspectRatio }]}>
              <Image
                source={{ uri: field.localImageUri }}
                style={styles.image}
                resizeMode="contain"
              />
              <DetectionOverlay detections={field.detections} />
            </View>
            <ParticleLegend detections={field.detections} />
          </>
        )}

        <View style={styles.countsSection}>
          {counts.map(([particleType, count]) => (
            <View key={particleType} style={styles.componentCard}>
              <View
                style={[
                  styles.componentAccent,
                  { backgroundColor: getParticleColor(particleType) },
                ]}
              />
              <Text style={styles.countLabel}>{formatParticleName(particleType)}</Text>
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

      {canMarkReviewed && (
        <View style={styles.markReviewedRow}>
          <TouchableOpacity
            style={styles.markReviewedBtn}
            onPress={onMarkReviewed}
            disabled={isSubmitting}
            testID="mark-field-reviewed-button"
          >
            <Icon name="eye-outline" size={16} color={colors.indigo800} />
            <Text style={styles.markReviewedLabel}>{FIELD_CAPTURE_TEXT.markAsReviewedLabel}</Text>
          </TouchableOpacity>
        </View>
      )}

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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mlg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gray200,
  },
  backButton: { width: 32, height: 32, justifyContent: 'center', marginRight: spacing.sm },
  headerTitles: { flex: 1 },
  title: { ...typography.title, color: colors.gray900 },
  counterText: { ...typography.caption, color: colors.gray500, marginTop: spacing.xs },
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.indigo100,
  },
  reviewedBadgeText: {
    ...typography.caption,
    color: colors.indigo800,
    fontWeight: fontWeight.semibold,
  },
  scrollContent: { paddingBottom: spacing.xl },
  imageWrapper: {
    backgroundColor: colors.black,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  awaitingBoxes: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  awaitingBoxesText: { ...typography.body, color: colors.gray300, textAlign: 'center' },
  countsSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm },
  componentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.smd,
    borderRadius: radius.lg,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  componentAccent: { width: 8, height: 8, borderRadius: radius.pill },
  countLabel: { ...typography.body, color: colors.gray700, flex: 1 },
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
  markReviewedRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
  },
  markReviewedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.indigo800,
  },
  markReviewedLabel: {
    ...typography.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.indigo800,
  },
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
