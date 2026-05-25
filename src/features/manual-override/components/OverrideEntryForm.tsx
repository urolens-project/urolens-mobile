// Path: urolens-mobile/src/features/manual-override/components/OverrideEntryForm.tsx
import React, { useState } from 'react';
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
import { useManualOverride } from '../hooks/useManualOverride';

interface OverrideEntryFormProps {
  resultId: string;
  parameter: string;
  originalAiValue: number;
}

export function OverrideEntryForm({
  resultId,
  parameter,
  originalAiValue,
}: OverrideEntryFormProps): React.JSX.Element {
  const { isSubmitting, error, submitOverride } = useManualOverride();
  const [correctedValue, setCorrectedValue] = useState('');
  const [rationale, setRationale] = useState('');

  const correctedNum = parseFloat(correctedValue);
  const isValid =
    correctedValue.trim().length > 0 &&
    !isNaN(correctedNum) &&
    correctedNum >= 0 &&
    rationale.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    await submitOverride(resultId, {
      parameter,
      correctedValue: correctedNum,
      rationale: rationale.trim(),
    });
    if (!error) {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Parameter header */}
        <View style={styles.parameterHeader}>
          <Text style={styles.parameterLabel}>Parameter</Text>
          <Text style={styles.parameterName}>{parameter}</Text>
        </View>

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
            style={[styles.input, correctedValue.length > 0 && !isNaN(correctedNum) && styles.inputValid]}
            value={correctedValue}
            onChangeText={setCorrectedValue}
            placeholder="Enter corrected count"
            placeholderTextColor="#9CA3AF"
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
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            returnKeyType="done"
            blurOnSubmit
            accessibilityLabel="Rationale for override"
          />
          <Text style={styles.charCount}>{rationale.length} characters</Text>
        </View>

        {/* Preservation notice */}
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Both the original AI value ({originalAiValue}) and your corrected value will
            be stored and visible to the Supervisor.
          </Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Submit button — disabled until both fields filled */}
        <TouchableOpacity
          style={[styles.submitButton, (!isValid || isSubmitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || isSubmitting}
          accessibilityLabel="Submit override"
          accessibilityRole="button"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Override</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={isSubmitting}
          accessibilityLabel="Cancel"
          accessibilityRole="button"
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  parameterHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  parameterLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  parameterName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  required: {
    color: '#DC2626',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputValid: {
    borderColor: '#6EE7B7',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  readOnlyField: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readOnlyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  readOnlyNote: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  notice: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
  },
  noticeText: {
    fontSize: 13,
    color: '#1D4ED8',
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
  },
  submitButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#2563EB',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#6B7280',
  },
});