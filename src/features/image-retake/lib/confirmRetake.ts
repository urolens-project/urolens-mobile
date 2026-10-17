import { Alert } from 'react-native';

import { IMAGE_RETAKE_TEXT } from '../constants/imageRetakeText.constant';

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

  Alert.alert(IMAGE_RETAKE_TEXT.discardOverridesTitle, IMAGE_RETAKE_TEXT.discardOverridesMessage, [
    { text: IMAGE_RETAKE_TEXT.cancelLabel, style: 'cancel' },
    { text: IMAGE_RETAKE_TEXT.retakeLabel, style: 'destructive', onPress: onRetake },
  ]);
}
