import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { colors, spacing } from '@src/theme';

import { useManualOverride } from '../hooks/useManualOverride';
import { OverrideFormTitleBar } from './OverrideFormTitleBar';
import { OverrideFormFields } from './OverrideFormFields';
import { OverrideFormActions } from './OverrideFormActions';

export interface OverrideEntryFormProps {
  resultId: string;
  specimenId: string;
  parameter: string;
  originalAiValue: number;
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
      <OverrideFormTitleBar parameter={parameter} onBack={handleCancel} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <OverrideFormFields
            originalAiValue={originalAiValue}
            correctedValue={correctedValue}
            onCorrectedValueChange={setCorrectedValue}
            rationale={rationale}
            onRationaleChange={setRationale}
          />
          <OverrideFormActions
            originalAiValue={originalAiValue}
            error={error}
            isValid={isValid}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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
});
