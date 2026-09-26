import { useCallback, useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Q } from '@nozbe/watermelondb';

import { database } from '@db/database';
import Specimen from '@db/models/Specimen';
import AnalysisResult from '@db/models/AnalysisResult';
import { latestAnalysisResultsBySpecimen } from '@db/latestAnalysisResultsBySpecimen';
import { RejectionReason } from '@app-types/enums';
import type { SpecimenStatus } from '@app-types/enums';
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { getRejectBlockedReason } from '@features/queue/lib/sampleState';
import { useRejectSpecimen } from '@features/specimen-rejection/hooks/useRejectSpecimen';
import { RejectionReasonModal } from '@features/specimen-rejection/components/RejectionReasonModal';

/**
 * @description Route entry for /sample/reject/:id. Loads the specimen and its latest
 * result via live WatermelonDB queries, blocks rejection when the workflow disallows
 * it, and otherwise renders the rejection reason form.
 */
export default function RejectSpecimenScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [specimenInfo, setSpecimenInfo] = useState<{
    sampleUid: string;
    patientUid: string;
    serverId: string | null;
    status: SpecimenStatus;
  } | null>(null);
  const [resultStatus, setResultStatus] = useState<AnalysisResult['status'] | null>(null);
  const [isLoadingSpecimen, setIsLoadingSpecimen] = useState(true);

  const [selectedReason, setSelectedReason] = useState<RejectionReason | null>(null);
  const [note, setNote] = useState('');

  const { reject, isLoading: isRejecting } = useRejectSpecimen(id ?? '');

  useEffect(() => {
    if (!id) return;

    const sub = database
      .get<Specimen>('specimens')
      .query(Q.where('id', id))
      .observeWithColumns(['status', 'server_id'])
      .subscribe((results) => {
        if (results[0]) {
          setSpecimenInfo({
            sampleUid: results[0].sampleUid,
            patientUid: results[0].patientUid,
            serverId: results[0].serverId,
            status: results[0].status as SpecimenStatus,
          });
        }
        setIsLoadingSpecimen(false);
      });
    return () => sub.unsubscribe();
  }, [id]);

  // Whether the specimen can still be rejected depends on where its result has got to,
  // so watch that too. This screen is also reachable straight from the Queue (and from a
  // notification), not only from Sample Detail, so it enforces the rule itself.
  const specimenServerId = specimenInfo?.serverId;
  useEffect(() => {
    if (!specimenServerId) return;

    const sub = database
      .get<AnalysisResult>('analysis_results')
      .query(Q.where('specimen_id', specimenServerId))
      .observeWithColumns(['status'])
      .subscribe((results) => {
        setResultStatus(
          latestAnalysisResultsBySpecimen(results).get(specimenServerId)?.status ?? null,
        );
      });
    return () => sub.unsubscribe();
  }, [specimenServerId]);

  const blockedReason = specimenInfo
    ? getRejectBlockedReason(specimenInfo.status, resultStatus)
    : null;

  const handleConfirm = useCallback(async (): Promise<void> => {
    if (!selectedReason) return;

    const outcome = await reject(selectedReason, note);
    if (outcome.status === 'rejected') {
      router.replace(`/(medtech)/sample/${id}`);
    } else {
      Alert.alert('Rejection Failed', outcome.message);
    }
  }, [selectedReason, note, reject, router, id]);

  const handleBack = useCallback((): void => router.back(), [router]);
  const handleBackToSample = useCallback(
    (): void => router.replace(`/(medtech)/sample/${id}`),
    [router, id],
  );

  if (isLoadingSpecimen) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.red700} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.gray100} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-back" size={24} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Reject Specimen</Text>
        {/* Spacer to center title */}
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Specimen info card */}
        {specimenInfo && (
          <View style={styles.specimenCard}>
            <Text style={styles.specimenUid}>{specimenInfo.sampleUid}</Text>
            <Text style={styles.specimenName}>{specimenInfo.patientUid}</Text>
          </View>
        )}

        {blockedReason ? (
          <View style={styles.blockedCard} accessibilityRole="alert">
            <Icon name="information-circle-outline" size={20} color={colors.amber800} />
            <View style={styles.blockedText}>
              <Text style={styles.blockedTitle}>Cannot reject this specimen</Text>
              <Text style={styles.blockedBody}>{blockedReason}</Text>
              <TouchableOpacity
                style={styles.blockedBtn}
                onPress={handleBackToSample}
                accessibilityRole="button"
              >
                <Text style={styles.blockedBtnText}>Back to sample</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Reason selection + confirm */
          <RejectionReasonModal
            selectedReason={selectedReason}
            onSelectReason={setSelectedReason}
            note={note}
            onNoteChange={setNote}
            onConfirm={handleConfirm}
            isLoading={isRejecting}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
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
    width: 40,
    height: 40,
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

  specimenCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mlg,
  },
  specimenUid: {
    fontFamily: 'Courier',
    ...typography.caption,
    color: colors.gray500,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  specimenName: {
    ...typography.titleLg,
    color: colors.gray800,
  },

  blockedCard: {
    flexDirection: 'row',
    gap: spacing.smd,
    backgroundColor: colors.amber50,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.amber200,
    padding: spacing.lg,
  },
  blockedText: { flex: 1, gap: spacing.sm },
  blockedTitle: { ...typography.bodyLg, fontWeight: fontWeight.bold, color: colors.amber800 },
  blockedBody: { ...typography.body, color: colors.amber700, lineHeight: 19 },
  blockedBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.mlg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.amber200,
  },
  blockedBtnText: { ...typography.body, fontWeight: fontWeight.semibold, color: colors.amber800 },
});
