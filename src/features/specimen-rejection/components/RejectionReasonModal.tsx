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
import { MAX_REJECTION_NOTE_LENGTH } from '../constants/specimenRejection.constant';
import { RejectionReasonCard } from './RejectionReasonCard';

export interface RejectionReasonModalProps {
  selectedReason: RejectionReason | null;
  onSelectReason: (r: RejectionReason) => void;
  note: string;
  onNoteChange: (text: string) => void;
  onConfirm: () => void;
  isLoading: boolean;
  isReadOnly?: boolean;
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
 * @param isReadOnly - Locks accepted values while retrying a failed local save.
 */
export function RejectionReasonModal({
  selectedReason,
  onSelectReason,
  note,
  onNoteChange,
  onConfirm,
  isLoading,
  isReadOnly = false,
}: RejectionReasonModalProps): React.JSX.Element {
  const scrollRef = useRef<ScrollView>(null);
  const isFormLocked = isLoading || isReadOnly;
  const isConfirmDisabled = !selectedReason || isLoading || note.length > MAX_REJECTION_NOTE_LENGTH;

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Warning banner */}
      <View style={styles.warningBanner}>
        <Icon name="warning-outline" size={spacing.xl} color={colors.amber800} />
        <Text style={styles.warningText}>
          Rejecting a specimen is permanent and cannot be undone.
        </Text>
      </View>

      {/* Reason selection */}
      <Text style={styles.sectionTitle}>Select Rejection Reason</Text>
      <View style={styles.reasonList}>
        {REJECTION_REASONS.map((r) => (
          <RejectionReasonCard
            key={r.value}
            reason={r}
            isSelected={selectedReason === r.value}
            onSelect={() => onSelectReason(r.value)}
            isDisabled={isFormLocked}
          />
        ))}
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
        maxLength={MAX_REJECTION_NOTE_LENGTH}
        editable={!isFormLocked}
        textAlignVertical="top"
        accessibilityLabel="Additional notes"
        onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
      />
      <Text style={styles.charCount}>
        {note.length}/{MAX_REJECTION_NOTE_LENGTH}
      </Text>

      {/* Confirm button */}
      <TouchableOpacity
        style={[styles.confirmBtn, isConfirmDisabled && styles.confirmBtnDisabled]}
        onPress={onConfirm}
        disabled={isConfirmDisabled}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={isReadOnly ? 'Retry saving rejection' : 'Confirm rejection'}
        accessibilityState={{ disabled: isConfirmDisabled, busy: isLoading }}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <>
            <Icon name="close-circle-outline" size={spacing.xl} color={colors.white} />
            <Text style={styles.confirmBtnText}>
              {isReadOnly ? 'Retry Saving Rejection' : 'Confirm Rejection'}
            </Text>
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
    lineHeight: spacing.xl,
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

  noteInput: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.md,
    ...typography.bodyLg,
    color: colors.gray800,
    minHeight: spacing.huge * 2 + spacing.sm,
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
    paddingVertical: spacing.lg,
  },
  confirmBtnDisabled: {
    backgroundColor: colors.gray300,
  },
  confirmBtnText: {
    ...typography.title,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
