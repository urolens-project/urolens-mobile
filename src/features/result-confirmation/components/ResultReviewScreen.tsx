import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmRetake } from '@features/image-retake/lib/confirmRetake';
import { useHasManualOverrides } from '@features/manual-override/hooks/useHasManualOverrides';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { colors, radius, spacing } from '@src/theme';

import { Icon } from '@components/Icon';
import { OfflineBanner } from '@components/OfflineBanner';

import { useResultConfirmation } from '../hooks/useResultConfirmation';
import { AIDisclaimer } from './AIDisclaimer';
import { AIFindingsPanel } from './AIFindingsPanel';
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

  // Retaking purges the MedTech's overrides, and this is the screen where they make
  // them — so warn first, same as Sample Detail does.
  const handleRetake = (): void => {
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
  };

  const handleContinue = (): void => {
    router.replace({
      pathname: '/(medtech)/sample/[id]',
      params: { id: specimenId },
    });
  };

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

      <View style={[styles.titleBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.titleBarBack}
          onPress={() =>
            router.replace({
              pathname: '/(medtech)/sample/[id]',
              params: { id: specimenId },
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Back to sample detail"
        >
          <Icon name="chevron-back" size={26} color={colors.teal} />
        </TouchableOpacity>
        <View style={styles.titleBarContent}>
          <Text style={styles.titleBarText}>Analysis Result</Text>
          <Text style={styles.titleBarSub}>
            {isConfirmed ? 'Submitted for Supervisor approval' : 'Pending your confirmation'}
          </Text>
        </View>
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

        <View style={styles.scrollSpacer} />
      </ScrollView>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.retakeButton}
          onPress={handleRetake}
          accessible={true}
          accessibilityLabel="Retake image"
          accessibilityRole="button"
        >
          <Text style={styles.retakeButtonText}>Retake Image</Text>
        </TouchableOpacity>

        {isConfirmed ? (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleContinue}
            accessible={true}
            accessibilityLabel="Continue to sample detail"
            accessibilityRole="button"
          >
            <Text style={styles.confirmButtonText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.confirmButton, isConfirming && styles.confirmButtonBusy]}
            onPress={confirmResult}
            disabled={isConfirming}
            accessible={true}
            accessibilityLabel={
              isConfirming
                ? 'Running diagnosis'
                : isOnline
                  ? 'Confirm Result'
                  : 'Queue Confirmation'
            }
            accessibilityRole="button"
          >
            {isConfirming ? (
              <View style={styles.confirmingRow}>
                <ActivityIndicator size="small" color={colors.white} />
                <Text style={styles.confirmButtonText}>Running diagnosis...</Text>
              </View>
            ) : (
              <Text style={styles.confirmButtonText}>
                {isOnline ? 'Confirm Result' : 'Queue Confirmation'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
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
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 0.5,
    // TODO(theme): near-black hairline at 0.08 alpha not in palette.
    borderBottomColor: 'rgba(0,0,0,0.08)',
    backgroundColor: colors.cream,
  },
  titleBarBack: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBarContent: {
    flex: 1,
    paddingRight: 44,
  },
  titleBarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  titleBarSub: {
    fontSize: 13,
    color: colors.warmGray500,
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 0.5,
    // TODO(theme): near-black hairline at 0.1 alpha not in palette.
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  retakeButton: {
    flex: 1,
    paddingVertical: spacing.mlg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray300,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  retakeButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray700,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: spacing.mlg,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: colors.teal,
  },
  confirmButtonBusy: {
    opacity: 0.75,
  },
  confirmingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.emerald50,
    borderWidth: 1,
    borderColor: colors.emerald200,
    borderRadius: 10,
  },
  confirmedText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.emerald800,
  },
  errorText: {
    fontSize: 13,
    color: colors.red600,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
