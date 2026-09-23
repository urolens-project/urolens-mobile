import { Alert } from 'react-native';

// A retake runs a new AI analysis and the backend reuses the same result row, so
// any manual overrides are purged (see ImageCaptureScreen). Warn before that happens
// — from every screen that offers Retake, so none of them can silently throw away
// the MedTech's corrections. With nothing to lose it goes straight ahead.
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
