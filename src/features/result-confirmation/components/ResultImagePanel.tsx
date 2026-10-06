import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

const DEFAULT_IMAGE_ASPECT_RATIO = 4 / 3;

export interface ResultImagePanelProps {
  imageUrl: string | null;
}

/**
 * @description Displays the microscopy image for review before result confirmation.
 * @param imageUrl - Image URL from the result details.
 */
export function ResultImagePanel({ imageUrl }: ResultImagePanelProps): React.JSX.Element {
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_IMAGE_ASPECT_RATIO);
  const [hasImageError, setHasImageError] = useState(false);
  const isImageAvailable = !!imageUrl && !hasImageError;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Microscopy image</Text>
      {isImageAvailable ? (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, { aspectRatio }]}
          resizeMode="contain"
          accessibilityLabel="Microscopy image"
          onLoad={(event): void => {
            const { width, height } = event.nativeEvent.source;
            if (width > 0 && height > 0) setAspectRatio(width / height);
          }}
          onError={(): void => setHasImageError(true)}
        />
      ) : (
        <Text style={styles.message}>
          Microscopy image unavailable. Connect and reload the result to try again.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  title: { ...typography.label, color: colors.ink },
  image: {
    width: '100%',
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
  },
  message: { ...typography.body, color: colors.gray500 },
});
