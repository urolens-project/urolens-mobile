import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { RejectionReason } from '@app-types/enums';
import { colors, fontWeight, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { useRejectSpecimen } from '../hooks/useRejectSpecimen';
import { useSpecimenRejectionInfo } from '../hooks/useSpecimenRejectionInfo';
import { BlockedRejectionCard } from './BlockedRejectionCard';
import { RejectionReasonModal } from './RejectionReasonModal';
import { SpecimenInfoCard } from './SpecimenInfoCard';

export interface RejectSpecimenScreenProps {
  specimenId: string;
}

/**
 * @description Reject-specimen screen: loads the specimen and its latest result via live
 * WatermelonDB queries, blocks rejection when the workflow disallows it, and otherwise
 * renders the rejection reason form.
 * @param specimenId - Local specimen id from the route.
 */
export function RejectSpecimenScreen({ specimenId }: RejectSpecimenScreenProps): React.JSX.Element {
  const router = useRouter();
  const { specimenInfo, isLoadingSpecimen, blockedReason } = useSpecimenRejectionInfo(specimenId);
  const { reject, isLoading: isRejecting, hasAcceptedRejection } = useRejectSpecimen(specimenId);

  const [selectedReason, setSelectedReason] = useState<RejectionReason | null>(null);
  const [note, setNote] = useState('');

  const handleConfirm = useCallback(async (): Promise<void> => {
    if (
      !selectedReason ||
      isRejecting ||
      isLoadingSpecimen ||
      (blockedReason && !hasAcceptedRejection)
    )
      return;

    const outcome = await reject(selectedReason, note);
    if (outcome.status === 'rejected') {
      if (outcome.isQueued) {
        Alert.alert(
          'Rejection queued',
          'This specimen was rejected on this device. The rejection will be submitted when you are back online.',
        );
      }
      router.replace(`/(medtech)/sample/${specimenId}`);
    } else if (outcome.status === 'failed') {
      Alert.alert('Rejection Failed', outcome.message);
    }
  }, [
    selectedReason,
    note,
    reject,
    router,
    specimenId,
    isRejecting,
    isLoadingSpecimen,
    blockedReason,
    hasAcceptedRejection,
  ]);

  const handleBack = useCallback((): void => {
    if (!isRejecting) router.back();
  }, [router, isRejecting]);
  const handleBackToSample = useCallback((): void => {
    if (specimenInfo) router.replace(`/(medtech)/sample/${specimenId}`);
    else router.replace('/(medtech)/queue');
  }, [router, specimenId, specimenInfo]);

  if (isLoadingSpecimen) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.red700} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.gray100} />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          disabled={isRejecting}
          accessibilityState={{ disabled: isRejecting }}
        >
          <Icon name="chevron-back" size={spacing.xxl} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Reject Specimen</Text>
        {/* Spacer to center title */}
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {specimenInfo && (
          <SpecimenInfoCard
            sampleUid={specimenInfo.sampleUid}
            patientUid={specimenInfo.patientUid}
          />
        )}

        {blockedReason && !hasAcceptedRejection ? (
          <BlockedRejectionCard reason={blockedReason} onBackToSample={handleBackToSample} />
        ) : (
          <RejectionReasonModal
            selectedReason={selectedReason}
            onSelectReason={setSelectedReason}
            note={note}
            onNoteChange={setNote}
            onConfirm={handleConfirm}
            isLoading={isRejecting}
            isReadOnly={hasAcceptedRejection}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray100,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.gray100,
  },
  backBtn: {
    width: spacing.huge,
    height: spacing.huge,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    ...typography.titleLg,
    fontWeight: fontWeight.semibold,
    color: colors.gray800,
  },
});
