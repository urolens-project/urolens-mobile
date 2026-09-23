// app/(medtech)/sample/reject/[id].tsx
import React, { useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import Specimen from '@db/models/Specimen';
import AnalysisResult from '@db/models/AnalysisResult';
import { latestAnalysisResultsBySpecimen } from '@db/latestAnalysisResultsBySpecimen';
import { RejectionReason } from '@app-types/enums';
import type { SpecimenStatus } from '@app-types/enums';
import { getRejectBlockedReason } from '@features/queue/lib/sampleState';
import { useRejectSpecimen } from '@src/features/specimen-rejection/hooks/useRejectSpecimen';
import { RejectionReasonModal } from '@src/features/specimen-rejection/components/RejectionReasonModal';

export default function RejectSpecimenScreen() {
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

  async function handleConfirm() {
    if (!selectedReason) return;

    const outcome = await reject(selectedReason, note);
    if (outcome.status === 'rejected') {
      router.replace(`/(medtech)/sample/${id}`);
    } else {
      Alert.alert('Rejection Failed', outcome.message);
    }
  }

  if (isLoadingSpecimen) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#B91C1C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color="#374151" />
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
            <Ionicons name="information-circle-outline" size={20} color="#92400E" />
            <View style={styles.blockedText}>
              <Text style={styles.blockedTitle}>Cannot reject this specimen</Text>
              <Text style={styles.blockedBody}>{blockedReason}</Text>
              <TouchableOpacity
                style={styles.blockedBtn}
                onPress={() => router.replace(`/(medtech)/sample/${id}`)}
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
    backgroundColor: '#F3F4F6',
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
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
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },

  specimenCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  specimenUid: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  specimenName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },

  blockedCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 16,
  },
  blockedText: { flex: 1, gap: 6 },
  blockedTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  blockedBody: { fontSize: 13, color: '#B45309', lineHeight: 19 },
  blockedBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  blockedBtnText: { fontSize: 13, fontWeight: '600', color: '#92400E' },
});
