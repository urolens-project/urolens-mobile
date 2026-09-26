// Path: urolens-mobile/src/features/manual-override/components/OverrideEntryForm.tsx
import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { useManualOverride } from '../hooks/useManualOverride';

export interface OverrideEntryFormProps {
  resultId: string;
  specimenId: string;
  parameter: string;
  originalAiValue: number;
}

function formatParameter(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * @description Form for a medtech to manually correct one AI-reported parameter value,
 * preserving the original AI value and requiring a rationale for the correction.
 * @param resultId - Server id of the analysis result being corrected.
 * @param specimenId - Local specimen id, used to navigate back to the sample detail screen.
 * @param parameter - Machine name of the parameter being overridden (e.g. "RBC").
 * @param originalAiValue - The AI-reported value, shown read-only for reference.
 */
export function OverrideEntryForm({
  resultId,
  specimenId,
  parameter,
  originalAiValue,
}: OverrideEntryFormProps): React.JSX.Element {
  // 1. Store / service hooks
  const { isSubmitting, error, submitOverride } = useManualOverride();

  // 3. State & derived
  const [correctedValue, setCorrectedValue] = useState('');
  const [rationale, setRationale] = useState('');
  const correctedNum = parseFloat(correctedValue);
  const isValid =
    correctedValue.trim().length > 0 &&
    !isNaN(correctedNum) &&
    correctedNum >= 0 &&
    rationale.trim().length > 0;

  // 6. Handlers
  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!isValid || isSubmitting) return;
    const success = await submitOverride(resultId, {
      parameter,
      originalAiValue,
      correctedValue: correctedNum,
      rationale: rationale.trim(),
    });
    if (success) {
      router.replace({
        pathname: '/(medtech)/sample/[id]',
        params: { id: specimenId, resultId },
      });
    }
  }, [isValid, isSubmitting, submitOverride, resultId, parameter, originalAiValue, correctedNum, rationale, specimenId]);

  const handleCancel = useCallback((): void => {
    router.replace({
      pathname: '/(medtech)/sample/[id]',
      params: { id: specimenId, resultId },
    });
  }, [specimenId, resultId]);

  return (
    <View style={styles.flex}>
      {/* Fixed title bar */}
      <View style={styles.titleBar}>
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.backButton}
          accessibilityLabel="Go back to Analysis Result"
          accessibilityRole="button"
        >
          <Icon name="chevron-back" size={26} color={colors.teal} />
        </TouchableOpacity>
        <View style={styles.titleContent}>
          <Text style={styles.titleText}>Override Parameter</Text>
          <View style={styles.paramPill}>
            <Text style={styles.paramPillText}>{formatParameter(parameter)}</Text>
          </View>
        </View>
      </View>

      {/* Scrollable form */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Original AI value — always read-only */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>AI-generated value</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyValue}>{originalAiValue}</Text>
              <Text style={styles.readOnlyNote}>Read-only — original preserved</Text>
            </View>
          </View>

          {/* Corrected value input */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              Corrected value <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                correctedValue.length > 0 && !isNaN(correctedNum) && styles.inputValid,
              ]}
              value={correctedValue}
              onChangeText={setCorrectedValue}
              placeholder="Enter corrected count"
              placeholderTextColor={colors.warmGray400}
              keyboardType="numeric"
              returnKeyType="next"
              accessibilityLabel="Corrected value"
            />
          </View>

          {/* Rationale input — required */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              Rationale <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={rationale}
              onChangeText={setRationale}
              placeholder="Explain why you are overriding this value (required)"
              placeholderTextColor={colors.warmGray400}
              multiline
              numberOfLines={4}
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              accessibilityLabel="Rationale for override"
            />
            <Text style={styles.charCount}>{rationale.length} characters</Text>
          </View>

          {/* Preservation notice */}
          <View style={styles.notice}>
            <Icon
              name="information-circle-outline"
              size={16}
              color={colors.teal}
              style={styles.noticeIcon}
            />
            <Text style={styles.noticeText}>
              Both the original AI value ({originalAiValue}) and your corrected value will
              be stored and visible to the Supervisor.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Icon
                name="alert-circle-outline"
                size={15}
                color={colors.red600}
                style={styles.noticeIcon}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isValid || isSubmitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isValid || isSubmitting}
            accessibilityLabel="Submit override"
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Submit Override</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={isSubmitting}
            accessibilityLabel="Cancel and go back to Analysis Result"
            accessibilityRole="button"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    backgroundColor: colors.cream,
    gap: spacing.xs,
  },
  backButton: {
    padding: spacing.sm,
  },
  titleContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  titleText: {
    ...typography.titleLg,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  paramPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(46,125,122,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(46,125,122,0.3)',
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  paramPillText: {
    ...typography.body,
    fontWeight: fontWeight.bold,
    color: colors.teal,
  },
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
    paddingBottom: spacing.jumbo,
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.bodyLg,
    fontWeight: fontWeight.medium,
    color: colors.ink,
  },
  required: {
    color: colors.red600,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.mlg,
    paddingVertical: spacing.mlg,
    fontSize: typography.title.fontSize,
    color: colors.ink,
  },
  inputValid: {
    borderColor: colors.teal,
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.micro,
    color: colors.warmGray500,
    textAlign: 'right',
  },
  readOnlyField: {
    backgroundColor: colors.cream,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.mlg,
    paddingVertical: spacing.mlg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readOnlyValue: {
    ...typography.title,
    color: colors.ink,
  },
  readOnlyNote: {
    ...typography.micro,
    color: colors.warmGray500,
    fontStyle: 'italic',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.tealTint3,
    borderRadius: radius.md,
    padding: spacing.mlg,
    borderWidth: 0.5,
    borderColor: 'rgba(46,125,122,0.25)',
    gap: spacing.sm,
  },
  noticeIcon: {
    marginTop: 1,
  },
  noticeText: {
    flex: 1,
    ...typography.body,
    color: colors.teal,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.red50,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.red200,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    ...typography.body,
    color: colors.red600,
    lineHeight: 18,
  },
  submitButton: {
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: colors.teal,
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    ...typography.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  cancelButton: {
    paddingVertical: spacing.mlg,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.subtitle,
    color: colors.warmGray500,
  },
});
