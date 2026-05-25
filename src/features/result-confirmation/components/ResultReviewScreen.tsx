// Path: urolens-mobile/src/features/result-confirmation/components/ResultReviewScreen.tsx
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useResultConfirmation } from '../hooks/useResultConfirmation';
import { AIDisclaimer } from './AIDisclaimer';
import { AIFindingsPanel } from './AIFindingsPanel';
import { SmartDiagnosisPanel } from './SmartDiagnosisPanel';
import { OfflineBanner } from '@components/OfflineBanner';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

interface ResultReviewScreenProps {
  resultId: string;
  specimenId: string;
}

export function ResultReviewScreen({
  resultId,
  specimenId,
}: ResultReviewScreenProps): React.JSX.Element {
  const { isOnline } = useNetworkStatus();
  const {
    result,
    aiFindings,
    isLoading,
    isConfirming,
    error,
    confirmResult,
  } = useResultConfirmation(resultId);

  const isConfirmed = result?.isConfirmed ?? false;

  const handleOverride = (parameter: string, originalValue: number) => {
    router.push({
      pathname: '/(medtech)/sample/override/[id]',
      params: { id: resultId, parameter, originalValue: String(originalValue) },
    });
  };

  const handleRetake = () => {
    router.push({
      pathname: '/(medtech)/capture',
      params: { specimenId },
    });
  };

  const handleConfirm = async () => {
    if (isConfirmed) return;

    const message = isOnline
      ? 'Confirm this result? It will be sent to the Supervisor for approval.'
      : 'You are offline. The confirmation will be queued and sent when connectivity is restored.';

    Alert.alert('Confirm Result', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'default', onPress: confirmResult },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!result) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Result not found</Text>
      </View>
    );
  }

  const smartDiagnosis = result.smartDiagnosis
    ? {
        goutScore:              result.smartDiagnosis.gout_score,
        gnScore:                result.smartDiagnosis.gn_score,
        nephroScore:            result.smartDiagnosis.nephro_score,
        noSignificantIndicators: result.smartDiagnosis.no_significant_indicators,
        evidenceMap:            result.smartDiagnosis.evidence_map,
        unavailable:            result.smartDiagnosis.unavailable ?? false,
      }
    : null;

  return (
    <View style={styles.container}>
      {!isOnline && <OfflineBanner />}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mandatory compliance disclaimer — must always be first */}
        <AIDisclaimer />

        <AIFindingsPanel
          resultId={resultId}
          findings={aiFindings}
          onOverride={handleOverride}
          isConfirmed={isConfirmed}
        />

        <SmartDiagnosisPanel
          smartDiagnosis={smartDiagnosis}
          unavailable={result.smartDiagnosisUnavailable}
        />

        {/* Status banner when already confirmed */}
        {isConfirmed && (
          <View style={styles.confirmedBanner}>
            <Text style={styles.confirmedText}>
              ✓ Submitted for Supervisor approval
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Spacer for fixed action bar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action bar — fixed at bottom */}
      {!isConfirmed && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={handleRetake}
            accessibilityLabel="Retake image"
            accessibilityRole="button"
          >
            <Text style={styles.retakeButtonText}>Retake Image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmButton, isConfirming && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={isConfirming}
            accessibilityLabel="Confirm result"
            accessibilityRole="button"
          >
            {isConfirming ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmButtonText}>
                {isOnline ? 'Confirm Result' : 'Queue Confirmation'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  retakeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  retakeButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#2563EB',
  },
  confirmButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmedBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#166534',
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#991B1B',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
});