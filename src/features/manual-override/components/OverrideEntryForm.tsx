import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { colors, spacing, typography } from '@src/theme';

import { OfflineBanner } from '@components/OfflineBanner';

import { useManualOverride } from '../hooks/useManualOverride';
import { useOverrideContext } from '../hooks/useOverrideContext';
import { getOverrideValidationError, parseOverrideCount } from '../lib/overrideValidation';
import { OverrideFormTitleBar } from './OverrideFormTitleBar';
import { OverrideFormFields } from './OverrideFormFields';
import { OverrideFormActions } from './OverrideFormActions';

export interface OverrideEntryFormProps {
  resultId: string;
  specimenId: string;
  parameter: string;
}

/**
 * @description Corrects one particle count while preserving the stored AI finding and returning to the result only after saving.
 * @param props - Server result, local specimen and original AI parameter identifiers.
 */
export function OverrideEntryForm({
  resultId,
  specimenId,
  parameter,
}: OverrideEntryFormProps): React.JSX.Element {
  const { isOnline } = useNetworkStatus();
  const { isSubmitting, error, submitOverride } = useManualOverride();
  const { context, isLoading, error: contextError } = useOverrideContext(resultId, parameter);
  const [correctedValue, setCorrectedValue] = useState('');
  const [rationale, setRationale] = useState('');
  const correctedNum = parseOverrideCount(correctedValue);
  const validationError = getOverrideValidationError(correctedNum, rationale, context.currentValue);
  const isValid = !validationError && context.canEdit && !!specimenId;
  const isDirty = correctedValue.length > 0 || rationale.length > 0;
  const isEditable = context.canEdit && !isSubmitting && !contextError;
  const originalAiValue = context.originalAiValue;

  const returnToResult = useCallback((): void => {
    if (!specimenId) {
      router.replace('/(medtech)/queue');
      return;
    }
    router.replace({ pathname: '/(medtech)/sample/[id]', params: { id: specimenId, resultId } });
  }, [specimenId, resultId]);
  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!isValid || isSubmitting || correctedNum === null || originalAiValue === null) return;
    const success = await submitOverride(resultId, {
      parameter,
      originalAiValue,
      correctedValue: correctedNum,
      rationale: rationale.trim(),
    });
    if (!success) return;
    if (!isOnline)
      Alert.alert(
        'Override queued',
        'Your correction is saved on this device and will be submitted when it syncs.',
      );
    returnToResult();
  }, [
    isValid,
    isSubmitting,
    correctedNum,
    originalAiValue,
    resultId,
    parameter,
    rationale,
    submitOverride,
    isOnline,
    returnToResult,
  ]);
  const handleCancel = useCallback((): void => {
    if (isSubmitting) return;
    if (!isDirty) {
      returnToResult();
      return;
    }
    Alert.alert('Unsaved correction', 'Leave without saving this correction?', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard changes', style: 'destructive', onPress: returnToResult },
    ]);
  }, [isSubmitting, isDirty, returnToResult]);

  let blockedMessage = contextError;
  if (!blockedMessage && !isLoading && originalAiValue === null)
    blockedMessage = 'The original AI finding is unavailable. Return to the result and retry.';
  if (!blockedMessage && !specimenId)
    blockedMessage = 'The sample identifier is missing. Return to the queue and reopen the result.';

  return (
    <View style={styles.container}>
      {!isOnline && <OfflineBanner />}
      <OverrideFormTitleBar
        parameter={parameter}
        onBack={handleCancel}
        isSubmitting={isSubmitting}
      />
      {isLoading && (
        <ActivityIndicator accessibilityLabel="Loading original AI finding" color={colors.teal} />
      )}
      {blockedMessage && (
        <Text accessibilityRole="alert" style={styles.error}>
          {blockedMessage}
        </Text>
      )}
      {!isLoading && !blockedMessage && originalAiValue !== null && (
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.fields}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!context.canEdit && (
              <Text accessibilityRole="alert" style={styles.error}>
                This result is no longer editable. Return to the result to see its current status.
              </Text>
            )}
            <OverrideFormFields
              originalAiValue={originalAiValue}
              currentValue={context.currentValue}
              correctedValue={correctedValue}
              onCorrectedValueChange={setCorrectedValue}
              rationale={rationale}
              onRationaleChange={setRationale}
              isEditable={isEditable}
            />
            <OverrideFormActions
              originalAiValue={originalAiValue}
              error={error}
              validationError={isDirty && context.canEdit ? validationError : null}
              isValid={isValid && !contextError}
              isSubmitting={isSubmitting}
              isOnline={isOnline}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { flex: 1 },
  fields: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
    paddingBottom: spacing.jumbo,
  },
  error: { ...typography.body, color: colors.red700, padding: spacing.lg },
});
