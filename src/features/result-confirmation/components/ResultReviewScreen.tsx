// Path: urolens-mobile/src/features/result-confirmation/components/ResultReviewScreen.tsx
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useResultConfirmation } from '../hooks/useResultConfirmation';
import { AIDisclaimer } from './AIDisclaimer';
import { AIFindingsPanel } from './AIFindingsPanel';
import { SmartDiagnosisPanel } from './SmartDiagnosisPanel';
import { OfflineBanner } from '@components/OfflineBanner';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

const TEAL = '#2E7D7A';

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
      params: {
        specimenId: result?.specimenId ?? '',
        localSpecimenId: specimenId,
        existingImageId: result?.imageId ?? undefined,
      },
    });
  };

  const handleContinue = () => {
    router.replace({
      pathname: '/(medtech)/sample/[id]',
      params: { id: specimenId },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  if (!result) {
    return (
      <View style={styles.centered}>
        <Ionicons name="document-outline" size={52} color="#C9C7C1" />
        <Text style={styles.emptyTitle}>Result not found</Text>
        <Text style={styles.emptyBody}>This result may not have synced yet.</Text>
      </View>
    );
  }

  const smartDiagnosis = result.smartDiagnosis
    ? {
        goutScore:               result.smartDiagnosis.gout_score,
        gnScore:                 result.smartDiagnosis.gn_score,
        nephroScore:             result.smartDiagnosis.nephro_score,
        noSignificantIndicators: result.smartDiagnosis.no_significant_indicators,
        evidenceMap:             result.smartDiagnosis.evidence_map,
        unavailable:             result.smartDiagnosis.unavailable ?? false,
      }
    : null;

  return (
    <View style={styles.container}>
      {!isOnline && <OfflineBanner />}

      <View style={styles.titleBar}>
        <Text style={styles.titleBarText}>Analysis Result</Text>
        <Text style={styles.titleBarSub}>
          {isConfirmed ? 'Submitted for Supervisor approval' : 'Pending your confirmation'}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mandatory compliance disclaimer */}
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

        {isConfirmed && (
          <View style={styles.confirmedBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#065F46" />
            <Text style={styles.confirmedText}>Submitted for Supervisor approval</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

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
          style={styles.confirmButton}
          onPress={handleContinue}
          accessibilityLabel="Continue to sample detail"
          accessibilityRole="button"
        >
          <Text style={styles.confirmButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F3',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F6F3',
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: '#888780',
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  titleBar: {
    paddingHorizontal: 16,
    paddingTop: 72,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#F7F6F3',
  },
  titleBarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  titleBarSub: {
    fontSize: 13,
    color: '#888780',
    marginTop: 2,
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  retakeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
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
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: TEAL,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
  },
  confirmedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#065F46',
  },
});
