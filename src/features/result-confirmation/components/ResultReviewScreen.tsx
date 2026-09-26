import { useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmRetake } from '@features/image-retake/lib/confirmRetake';
import { useHasManualOverrides } from '@features/manual-override/hooks/useHasManualOverrides';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { colors, spacing } from '@src/theme';

import { Icon } from '@components/Icon';
import { OfflineBanner } from '@components/OfflineBanner';

import { useResultConfirmation } from '../hooks/useResultConfirmation';
import { AIDisclaimer } from './AIDisclaimer';
import { AIFindingsPanel } from './AIFindingsPanel';
import { ResultReviewActionBar } from './ResultReviewActionBar';
import { ResultReviewTitleBar } from './ResultReviewTitleBar';
import { SmartDiagnosisPanel } from './SmartDiagnosisPanel';

export interface ResultReviewScreenProps {
  resultId: string;
  specimenId: string;
}

/**
 * @description Post-capture review screen: shows the mandatory AI disclaimer, AI
 * findings (with per-parameter override), and Smart Diagnosis, then lets the MedTech
 * retake the image or confirm the result for supervisor approval.
 * @param resultId - Server id of the analysis result to review.
 * @param specimenId - Local specimen id, used for navigation back to sample detail.
 */
export function ResultReviewScreen({
  resultId,
  specimenId,
}: ResultReviewScreenProps): React.JSX.Element {
  const { isOnline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const hasOverrides = useHasManualOverrides(resultId);
  const { result, aiFindings, isLoading, isConfirming, error, confirmResult } =
    useResultConfirmation(resultId);

  const isConfirmed = result?.isConfirmed ?? false;

  const handleOverride = useCallback(
    (parameter: string, originalValue: number) => {
      router.push({
        pathname: '/(medtech)/sample/override/[id]',
        params: { id: resultId, specimenId, parameter, originalValue: String(originalValue) },
      });
    },
    [resultId, specimenId],
  );

  const handleBack = useCallback((): void => {
    router.replace({ pathname: '/(medtech)/sample/[id]', params: { id: specimenId } });
  }, [specimenId]);

  // Retaking purges the MedTech's overrides, and this is the screen where they make
  // them — so warn first, same as Sample Detail does.
  const handleRetake = useCallback((): void => {
    confirmRetake(hasOverrides, () => {
      router.push({
        pathname: '/(medtech)/capture',
        params: {
          specimenId: result?.specimenId ?? '',
          localSpecimenId: specimenId,
          existingImageId: result?.imageId ?? undefined,
        },
      });
    });
  }, [hasOverrides, result?.specimenId, result?.imageId, specimenId]);

  const handleContinue = useCallback((): void => {
    router.replace({ pathname: '/(medtech)/sample/[id]', params: { id: specimenId } });
  }, [specimenId]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator testID="loading" size="large" color={colors.teal} />
      </View>
    );
  }

  if (!result) {
    return (
      <View style={styles.centered}>
        <Icon name="document-outline" size={52} color={colors.warmGray200} />
        <Text style={styles.emptyTitle}>Result not found</Text>
        <Text style={styles.emptyBody}>This result may not have synced yet.</Text>
      </View>
    );
  }

  const smartDiagnosis = result.smartDiagnosis
    ? {
        goutScore: result.smartDiagnosis.gout?.level,
        gnScore: result.smartDiagnosis.glomerulonephritis?.level,
        nephroScore: result.smartDiagnosis.nephrolithiasis?.level,
        noSignificantIndicators: result.smartDiagnosis.no_significant_indicators,
        evidenceMap: {
          gout: result.smartDiagnosis.gout,
          glomerulonephritis: result.smartDiagnosis.glomerulonephritis,
          nephrolithiasis: result.smartDiagnosis.nephrolithiasis,
        },
        unavailable: false,
      }
    : null;

  return (
    <View style={styles.container}>
      {!isOnline && <OfflineBanner />}

      <ResultReviewTitleBar topInset={insets.top} isConfirmed={isConfirmed} onBack={handleBack} />

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

        <View style={styles.scrollSpacer} />
      </ScrollView>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <ResultReviewActionBar
        bottomInset={insets.bottom}
        isOnline={isOnline}
        isConfirmed={isConfirmed}
        isConfirming={isConfirming}
        onRetake={handleRetake}
        onConfirm={confirmResult}
        onContinue={handleContinue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
    gap: spacing.sm,
    paddingHorizontal: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink,
    marginTop: spacing.sm,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.warmGray500,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollSpacer: {
    // Clears the floating action bar at the bottom of the scroll content.
    height: 120,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  errorText: {
    fontSize: 13,
    color: colors.red600,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
