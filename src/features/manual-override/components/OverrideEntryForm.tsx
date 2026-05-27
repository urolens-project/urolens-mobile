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
import { Ionicons } from '@expo/vector-icons';
import { useManualOverride } from '../hooks/useManualOverride';

const TEAL = '#2E7D7A';
const BG = '#F7F6F3';

interface OverrideEntryFormProps {
  resultId: string;
  specimenId: string;
  parameter: string;
  originalAiValue: number;
}

function formatParameter(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function OverrideEntryForm({
  resultId,
  specimenId,
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
  };

  const handleCancel = () => {
    router.replace({
      pathname: '/(medtech)/sample/[id]',
      params: { id: specimenId, resultId },
    });
  };

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
          <Ionicons name="chevron-back" size={26} color={TEAL} />
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
              placeholderTextColor="#AEABA5"
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
              placeholderTextColor="#AEABA5"
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
            <Ionicons name="information-circle-outline" size={16} color={TEAL} style={styles.noticeIcon} />
            <Text style={styles.noticeText}>
              Both the original AI value ({originalAiValue}) and your corrected value will
              be stored and visible to the Supervisor.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={15} color="#DC2626" style={styles.noticeIcon} />
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
              <ActivityIndicator size="small" color="#FFFFFF" />
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
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    backgroundColor: BG,
    gap: 4,
  },
  backButton: {
    padding: 8,
  },
  titleContent: {
    flex: 1,
    gap: 2,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  paramPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(46,125,122,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(46,125,122,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 5,
  },
  paramPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEAL,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    padding: 16,
    paddingTop: 24,
    gap: 16,
    paddingBottom: 48,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  required: {
    color: '#DC2626',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#1A1A1A',
  },
  inputValid: {
    borderColor: TEAL,
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#888780',
    textAlign: 'right',
  },
  readOnlyField: {
    backgroundColor: BG,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readOnlyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  readOnlyNote: {
    fontSize: 11,
    color: '#888780',
    fontStyle: 'italic',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDFB',
    borderRadius: 10,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(46,125,122,0.25)',
    gap: 8,
  },
  noticeIcon: {
    marginTop: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: TEAL,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 0.5,
    borderColor: '#FECACA',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
  },
  submitButton: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: TEAL,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.45,
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
    fontWeight: '500',
    color: '#888780',
  },
});
