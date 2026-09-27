import { Alert } from 'react-native';

/**
 * @description Confirms before a retake when it would discard manual overrides. A retake
 * runs a new AI analysis and the backend reuses the same result row, so any manual
 * overrides are purged (see ImageCaptureScreen) — this is called from every screen that
 * offers Retake, so none of them can silently throw away the MedTech's corrections. With
 * nothing to lose, it goes straight ahead.
 * @param hasOverrides - Whether the current result has any manual overrides to lose.
 * @param onRetake - Called immediately (no overrides) or after the user confirms.
 */
export function confirmRetake(hasOverrides: boolean, onRetake: () => void): void {
  if (!hasOverrides) {
    onRetake();
    return;
  }

  Alert.alert(
    'Discard Overrides?',
    'Retaking the image will run a new AI analysis. Your existing manual overrides will be removed.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Retake', style: 'destructive', onPress: onRetake },
    ],
  );
}
