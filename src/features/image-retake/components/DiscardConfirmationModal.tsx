// src/features/image-retake/components/DiscardConfirmationModal.tsx
/**
 * DiscardConfirmationModal — T2.7
 *
 * Blocking modal shown before an image is discarded.
 * The MedTech must explicitly confirm before POST /images/{id}/discard is called.
 * Cancel returns them to the result review screen.
 */

import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

export interface DiscardConfirmationModalProps {
  visible: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * @description Confirmation modal shown before discarding a specimen image and its AI
 * analysis, since the action is destructive and cannot be undone.
 * @param visible - Whether the modal is shown.
 * @param isLoading - Whether the discard request is in flight; disables both actions.
 * @param onConfirm - Called when the medtech confirms the discard.
 * @param onCancel - Called when the medtech backs out (or presses the Android back button).
 */
export function DiscardConfirmationModal({
  visible,
  isLoading,
  onConfirm,
  onCancel,
}: DiscardConfirmationModalProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel} // Android back button
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* ── Icon ── */}
          <View style={styles.iconContainer}>
            <Icon name="warning" size={26} color={colors.amber800} />
          </View>

          {/* ── Copy ── */}
          <Text style={styles.title}>Discard this image?</Text>
          <Text style={styles.body}>
            The current image and its AI analysis will be discarded. You will need
            to recapture a new specimen image. This action cannot be undone.
          </Text>

          {/* ── Actions ── */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Cancel — keep current image"
            >
              <Text style={styles.cancelLabel}>Keep Image</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, isLoading && styles.buttonDisabled]}
              onPress={onConfirm}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Confirm discard and retake"
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.confirmLabel}>Discard &amp; Retake</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    // Shadow
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: radius.lg,
    elevation: 8,
  },
  iconContainer: {
    // Fixed 56x56 circle: radius is half the box, not a scale value.
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.amber100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.titleLg,
    fontWeight: fontWeight.bold,
    color: colors.gray900,
    textAlign: 'center',
    marginBottom: spacing.smd,
  },
  body: {
    ...typography.bodyLg,
    color: colors.gray500,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: spacing.mlg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: colors.gray100,
  },
  confirmButton: {
    backgroundColor: colors.red600,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelLabel: {
    ...typography.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.gray700,
  },
  confirmLabel: {
    ...typography.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
