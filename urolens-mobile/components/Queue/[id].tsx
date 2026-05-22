// app/(medtech)/sample/[id].tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import Specimen from '@db/models/Specimen';
import type { QueueItem } from './types'//'@features/queue/types';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function SampleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [specimen, setSpecimen] = useState<QueueItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Observe WatermelonDB record reactively so any sync update reflects immediately
    const subscription = database
      .get<Specimen>('specimens')
      .query(Q.where('id', id))
      .observe()
      .subscribe((results) => {
        if (results.length === 0) {
          setNotFound(true);
        } else {
          const s = results[0];
          setSpecimen({
            id: s.id,
            serverId: s.serverId,
            sampleUid: s.sampleUid,
            patientName: s.patientName,
            patientUid: s.patientUid,
            testType: s.testType,
            status: s.status as QueueItem['status'],
            priorityLevel: s.priorityLevel as QueueItem['priorityLevel'],
            receivedAt: s.receivedAt,
            medtechId: s.medtechId,
            syncedAt: s.syncedAt,
          });
        }
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [id]);

  function handleBeginAnalysis() {
    router.push(`/(medtech)/capture?specimenId=${id}`);
  }

  function handleRejectSpecimen() {
    router.push(`/(medtech)/sample/reject/${id}`);
  }

  function handleRequestReassignment() {
    Alert.alert(
      'Request Reassignment',
      'Are you sure you want to request reassignment for this sample?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: () => {
            // Placeholder: wire to reassignment service/hook in EPIC-MOB-04
            Alert.alert('Reassignment requested.');
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#185FA5" />
      </SafeAreaView>
    );
  }

  if (notFound || !specimen) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.notFoundText}>Sample not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const priorityColors: Record<string, { bg: string; text: string }> = {
    HIGH: { bg: '#FCEBEB', text: '#A32D2D' },
    NORMAL: { bg: '#EAF3DE', text: '#3B6D11' },
    LOW: { bg: '#F1EFE8', text: '#5F5E5A' },
  };
  const pColor = priorityColors[specimen.priorityLevel ?? 'NORMAL'];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderTop}>
            <Text style={styles.sampleUid}>{specimen.sampleUid}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: pColor.bg }]}>
              <Text style={[styles.priorityText, { color: pColor.text }]}>
                {specimen.priorityLevel ?? 'NORMAL'}
              </Text>
            </View>
          </View>
          <Text style={styles.patientName}>{specimen.patientName}</Text>
        </View>

        {/* Details card */}
        <View style={styles.card}>
          <DetailRow label="Patient UID" value={specimen.patientUid} />
          <View style={styles.divider} />
          <DetailRow label="Test Type" value={specimen.testType} />
          <View style={styles.divider} />
          <DetailRow label="Status" value={specimen.status.replace('_', ' ')} />
          <View style={styles.divider} />
          <DetailRow label="Received" value={formatDateTime(specimen.receivedAt)} />
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={handleBeginAnalysis}
            accessibilityRole="button"
            accessibilityLabel="Begin analysis for this sample"
          >
            <Text style={styles.actionBtnPrimaryText}>Begin Analysis</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={handleRejectSpecimen}
            accessibilityRole="button"
            accessibilityLabel="Reject this specimen"
          >
            <Text style={styles.actionBtnDangerText}>Reject Specimen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={handleRequestReassignment}
            accessibilityRole="button"
            accessibilityLabel="Request reassignment for this sample"
          >
            <Text style={styles.actionBtnSecondaryText}>Request Reassignment</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F6F3' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F6F3' },
  scroll: { padding: 16, paddingBottom: 40 },

  cardHeader: {
    marginBottom: 16,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sampleUid: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#888780',
    letterSpacing: 0.5,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  patientName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 2,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#888780',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  actions: {
    gap: 10,
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBtnPrimary: {
    backgroundColor: '#185FA5',
    borderColor: '#185FA5',
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionBtnDanger: {
    backgroundColor: '#FCEBEB',
    borderColor: '#F7C1C1',
  },
  actionBtnDangerText: {
    color: '#A32D2D',
    fontSize: 16,
    fontWeight: '500',
  },
  actionBtnSecondary: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0,0,0,0.15)',
  },
  actionBtnSecondaryText: {
    color: '#5F5E5A',
    fontSize: 16,
    fontWeight: '500',
  },

  notFoundText: {
    fontSize: 17,
    color: '#5F5E5A',
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#185FA5',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
});