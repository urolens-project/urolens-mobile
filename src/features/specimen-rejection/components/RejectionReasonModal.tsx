import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RejectionReason } from '@app-types/enums';

const TEAL = '#2E7D7A';

interface ReasonOption {
  value: RejectionReason;
  label: string;
  description: string;
}

const REASONS: ReasonOption[] = [
  {
    value: RejectionReason.INSUFFICIENT_VOLUME,
    label: 'Insufficient Volume',
    description: 'Sample volume is below the minimum required threshold.',
  },
  {
    value: RejectionReason.WRONG_CONTAINER,
    label: 'Wrong Container',
    description: 'Sample collected in an incompatible or incorrect container.',
  },
  {
    value: RejectionReason.UNLABELED,
    label: 'Unlabeled Specimen',
    description: 'Sample container is missing required patient identification.',
  },
  {
    value: RejectionReason.OTHER,
    label: 'Other',
    description: 'Another reason not listed above — specify in the notes field.',
  },
];

interface Props {
  selectedReason: RejectionReason | null;
  onSelectReason: (r: RejectionReason) => void;
  note: string;
  onNoteChange: (text: string) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function RejectionReasonModal({
  selectedReason,
  onSelectReason,
  note,
  onNoteChange,
  onConfirm,
  isLoading,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Warning banner */}
      <View style={styles.warningBanner}>
        <Ionicons name="warning-outline" size={18} color="#92400E" />
        <Text style={styles.warningText}>
          Rejecting a specimen is permanent and cannot be undone.
        </Text>
      </View>

      {/* Reason selection */}
      <Text style={styles.sectionTitle}>Select Rejection Reason</Text>
      <View style={styles.reasonList}>
        {REASONS.map((r) => {
          const isSelected = selectedReason === r.value;
          return (
            <TouchableOpacity
              key={r.value}
              style={[styles.reasonCard, isSelected && styles.reasonCardSelected]}
              onPress={() => onSelectReason(r.value)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
            >
              <View style={styles.reasonCardInner}>
                <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <View style={styles.reasonText}>
                  <Text style={[styles.reasonLabel, isSelected && styles.reasonLabelSelected]}>
                    {r.label}
                  </Text>
                  <Text style={styles.reasonDesc}>{r.description}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Optional note */}
      <Text style={styles.sectionTitle}>Notes (Optional)</Text>
      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={onNoteChange}
        placeholder="Add additional context or details..."
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={3}
        maxLength={500}
        textAlignVertical="top"
        accessibilityLabel="Additional notes"
        onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
      />
      <Text style={styles.charCount}>{note.length}/500</Text>

      {/* Confirm button */}
      <TouchableOpacity
        style={[styles.confirmBtn, !selectedReason && styles.confirmBtnDisabled]}
        onPress={onConfirm}
        disabled={!selectedReason || isLoading}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Confirm rejection"
        accessibilityState={{ disabled: !selectedReason || isLoading }}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>Confirm Rejection</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  reasonList: {
    gap: 8,
    marginBottom: 24,
  },
  reasonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  reasonCardSelected: {
    borderColor: TEAL,
    backgroundColor: '#F0F9F8',
  },
  reasonCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  radioOuterSelected: {
    borderColor: TEAL,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TEAL,
  },
  reasonText: {
    flex: 1,
    gap: 2,
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  reasonLabelSelected: {
    color: TEAL,
  },
  reasonDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  noteInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 88,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginBottom: 28,
  },

  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#B91C1C',
    borderRadius: 12,
    paddingVertical: 15,
  },
  confirmBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
