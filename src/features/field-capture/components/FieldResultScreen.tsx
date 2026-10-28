import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { DetectionOverlay } from './DetectionOverlay';
import { FIELD_CAPTURE_TEXT } from '../constants/fieldCaptureText.constant';
import type { CapturedField } from '../types';

export interface FieldResultScreenProps {
  field: CapturedField;
  isSubmitting: boolean;
  errorMessage: string | null;
  onProceed: () => void;
  onDiscard: () => void;
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
}: FieldResultScreenProps): React.JSX.Element {
  const counts = Object.entries(field.aiFindings).filter(([, count]) => count > 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{FIELD_CAPTURE_TEXT.fieldResultTitle(field.fieldNo)}</Text>
        <Text style={styles.counterText}>
          {FIELD_CAPTURE_TEXT.fieldCounterLabel(field.acceptedFieldCount, field.minFields)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageWrapper}>
          <Image source={{ uri: field.localImageUri }} style={styles.image} resizeMode="contain" />
          <DetectionOverlay detections={field.detections} />
        </View>

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
          <Icon name="trash-outline" size={18} color={colors.gray300} />
          <Text style={styles.discardLabel}>{FIELD_CAPTURE_TEXT.discardLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.proceedBtn]}
          onPress={onProceed}
          disabled={isSubmitting}
          testID="proceed-field-button"
        >
          <Icon name="checkmark-circle-outline" size={18} color={colors.white} />
          <Text style={styles.proceedLabel}>{FIELD_CAPTURE_TEXT.proceedLabel}</Text>
        </TouchableOpacity>
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

  return (
    <View style={styles.diagnosisSection}>
      <Text style={styles.diagnosisCaption}>{FIELD_CAPTURE_TEXT.thisFieldOnlyCaption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.blackAlt },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mlg,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  title: { ...typography.title, color: colors.white },
  counterText: { ...typography.caption, color: colors.gray500, marginTop: spacing.xs },
  scrollContent: { paddingBottom: spacing.xl },
  imageWrapper: { width: '100%', aspectRatio: 1, backgroundColor: colors.black },
  image: { flex: 1 },
  countsSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  countLabel: { ...typography.body, color: colors.gray300 },
  countValue: { ...typography.body, color: colors.white, fontWeight: fontWeight.semibold },
  emptyCountsText: { ...typography.body, color: colors.gray500 },
  diagnosisSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  diagnosisCaption: { ...typography.caption, color: colors.gray500 },
  diagnosisUnavailableText: { ...typography.caption, color: colors.gray500 },
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
    backgroundColor: colors.blackAlt,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
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
    backgroundColor: colors.navyAlt,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  proceedBtn: { backgroundColor: colors.teal },
  discardLabel: { ...typography.subtitle, fontWeight: fontWeight.semibold, color: colors.gray300 },
  proceedLabel: { ...typography.subtitle, fontWeight: fontWeight.semibold, color: colors.white },
});
