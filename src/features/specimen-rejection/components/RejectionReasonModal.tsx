import React, { useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';
import type { RejectionReason } from '@app-types/enums';

import { REJECTION_REASONS } from '../constants/rejectionReason.constant';

export interface RejectionReasonModalProps {
  selectedReason: RejectionReason | null;
  onSelectReason: (r: RejectionReason) => void;
  note: string;
  onNoteChange: (text: string) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

/**
 * @description Reason picker and note field for rejecting a specimen. Confirming is
 * disabled until a reason is picked; rejection is framed as permanent up front.
 * @param selectedReason - The currently selected rejection reason, if any.
 * @param onSelectReason - Called when a reason card is picked.
 * @param note - Current free-text note.
 * @param onNoteChange - Called as the note is edited.
 * @param onConfirm - Called when Confirm Rejection is pressed.
 * @param isLoading - Shows a spinner and disables Confirm while the rejection is in flight.
 */
export function RejectionReasonModal({
  selectedReason,
  onSelectReason,
  note,
  onNoteChange,
  onConfirm,
  isLoading,
}: RejectionReasonModalProps): React.JSX.Element {
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
        <Icon name="warning-outline" size={18} color={colors.amber800} />
        <Text style={styles.warningText}>
          Rejecting a specimen is permanent and cannot be undone.
        </Text>
      </View>

      {/* Reason selection */}
      <Text style={styles.sectionTitle}>Select Rejection Reason</Text>
      <View style={styles.reasonList}>
        {REJECTION_REASONS.map((r) => {
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
        placeholderTextColor={colors.gray400}
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
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <>
            <Icon name="close-circle-outline" size={20} color={colors.white} />
            <Text style={styles.confirmBtnText}>Confirm Rejection</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.smd,
    backgroundColor: colors.amber100,
    borderWidth: 1,
    borderColor: colors.amber200,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xxl,
  },
  warningText: {
    flex: 1,
    ...typography.body,
    color: colors.amber800,
    lineHeight: 18,
  },

  sectionTitle: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.smd,
  },

  reasonList: {
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  reasonCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    padding: spacing.mlg,
  },
  reasonCardSelected: {
    borderColor: colors.teal,
    backgroundColor: colors.tealTint4,
  },
  reasonCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10, // Half of width/height above — computed circle radius.
    borderWidth: 2,
    borderColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1, // TODO(theme): below spacing.xxs(2); left exact.
    flexShrink: 0,
  },
  radioOuterSelected: {
    borderColor: colors.teal,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5, // Half of width/height above — computed circle radius.
    backgroundColor: colors.teal,
  },
  reasonText: {
    flex: 1,
    gap: 2, // TODO(theme): below spacing.xxs(2)... exact (already the smallest step, left explicit).
  },
  reasonLabel: {
    ...typography.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.gray800,
  },
  reasonLabelSelected: {
    color: colors.teal,
  },
  reasonDesc: {
    ...typography.body,
    color: colors.gray500,
    lineHeight: 18,
  },

  noteInput: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.md,
    fontSize: 14,
    color: colors.gray800,
    minHeight: 88,
    marginBottom: spacing.xs,
  },
  charCount: {
    ...typography.caption,
    color: colors.gray400,
    textAlign: 'right',
    marginBottom: spacing.xxxl,
  },

  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.red700,
    borderRadius: radius.lg,
    paddingVertical: 15, // TODO(theme): between spacing.mlg(14)/lg(16); left exact.
  },
  confirmBtnDisabled: {
    backgroundColor: colors.gray300,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
