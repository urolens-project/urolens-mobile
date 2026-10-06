import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

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
      <View style={styles.header}>
        <Icon name="image-outline" size={16} color={colors.teal} />
        <Text accessibilityRole="header" style={styles.title}>
          Sample Image
        </Text>
      </View>
      <View style={styles.content}>
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
            Microscopy image unavailable. Connect and pull down to refresh.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.creamAlt,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  title: { ...typography.label, color: colors.ink },
  content: { padding: spacing.lg },
  image: {
    width: '100%',
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
  },
  message: { ...typography.body, color: colors.gray500 },
});
