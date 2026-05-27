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
import { RejectionReason } from '@app-types/enums';
import { MOCK_QUEUE_ITEMS } from '../../../../src/mocks/queueMockData';
import { useRejectSpecimen } from '../../../../src/features/specimen-rejection/hooks/useRejectSpecimen';
import { RejectionReasonModal } from '../../../../src/features/specimen-rejection/components/RejectionReasonModal';

const USE_MOCK = false;

export default function RejectSpecimenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [specimenInfo, setSpecimenInfo] = useState<{
    sampleUid: string;
    patientUid: string;
  } | null>(null);
  const [isLoadingSpecimen, setIsLoadingSpecimen] = useState(true);

  const [selectedReason, setSelectedReason] = useState<RejectionReason | null>(null);
  const [note, setNote] = useState('');

  const { reject, isLoading: isRejecting } = useRejectSpecimen(id ?? '');

  useEffect(() => {
    if (!id) return;

    if (USE_MOCK) {
      const found = MOCK_QUEUE_ITEMS.find((item) => item.id === id);
      if (found) setSpecimenInfo({ sampleUid: found.sampleUid, patientUid: found.patientUid });
      setIsLoadingSpecimen(false);
      return;
    }

    const sub = database
      .get<Specimen>('specimens')
      .query(Q.where('id', id))
      .observe()
      .subscribe((results) => {
        if (results[0]) {
          setSpecimenInfo({
            sampleUid: results[0].sampleUid,
            patientUid: results[0].patientUid,
          });
        }
        setIsLoadingSpecimen(false);
      });
    return () => sub.unsubscribe();
  }, [id]);

  async function handleConfirm() {
    if (!selectedReason) return;

    if (USE_MOCK) {
      Alert.alert(
        'Rejection Submitted (Mock)',
        `Reason: ${selectedReason}${note.trim() ? `\nNote: ${note.trim()}` : ''}`,
        [{ text: 'OK', onPress: () => router.replace('/(medtech)/queue') }],
      );
      return;
    }

    try {
      await reject(selectedReason, note);
      router.replace(`/(medtech)/sample/${id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred.';
      Alert.alert('Rejection Failed', message);
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

        {/* Reason selection + confirm */}
        <RejectionReasonModal
          selectedReason={selectedReason}
          onSelectReason={setSelectedReason}
          note={note}
          onNoteChange={setNote}
          onConfirm={handleConfirm}
          isLoading={isRejecting}
        />
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
});
