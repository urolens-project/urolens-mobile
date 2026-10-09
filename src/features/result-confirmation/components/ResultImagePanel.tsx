import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import {
  LEGEND_SWATCH_SIZE,
  SOURCE_LABELS,
  getParticleColor,
} from '../constants/particleAnnotation.constant';
import type { ImageDisplaySize } from '../lib/imageBoxGeometry';
import type { ImageBox } from '../types';
import { ResultBoundingBoxOverlay } from './ResultBoundingBoxOverlay';

const DEFAULT_IMAGE_ASPECT_RATIO = 4 / 3;

export interface ResultImagePanelProps {
  imageUrl: string | null;
  imageId?: string | null;
  boxes?: ImageBox[];
}

/**
 * @description Displays the microscopy image for review before result confirmation,
 * overlaying AI and reviewer boxes once the image has loaded and its
 * displayed size is known.
 * @param imageUrl - Image URL from the result details.
 * @param imageId - Stable image identity; changes on a retake.
 * @param boxes - Mapped boxes for the current image.
 */
export function ResultImagePanel({
  imageUrl,
  imageId,
  boxes = [],
}: ResultImagePanelProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="image-outline" size={spacing.lg} color={colors.teal} />
        <Text accessibilityRole="header" style={styles.title}>
          Sample Image
        </Text>
      </View>
      <ResultImageContent
        key={`${imageId ?? ''}:${imageUrl ?? ''}`}
        imageUrl={imageUrl}
        boxes={boxes}
      />
    </View>
  );
}

function ResultImageContent({ imageUrl, boxes = [] }: ResultImagePanelProps): React.JSX.Element {
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_IMAGE_ASPECT_RATIO);
  const [hasImageError, setHasImageError] = useState(false);
  const [imageSize, setImageSize] = useState<ImageDisplaySize | null>(null);
  const [containerSize, setContainerSize] = useState<ImageDisplaySize | null>(null);
  const isImageAvailable = !!imageUrl && !hasImageError;
  const isOverlayReady = isImageAvailable && !!imageSize && !!containerSize && boxes.length > 0;
  const legendText = buildLegendText(boxes);
  const accessibleSummary = [
    ...new Set(boxes.map((box): string => `${box.label}, ${SOURCE_LABELS[box.source]}`)),
  ].join('; ');

  return (
    <View style={styles.content}>
      {isImageAvailable ? (
        <View
          testID="sampleImageWrapper"
          style={styles.imageWrapper}
          onLayout={(event): void => {
            const { width, height } = event.nativeEvent.layout;
            setContainerSize(width > 0 && height > 0 ? { width, height } : null);
          }}
        >
          <Image
            source={{ uri: imageUrl }}
            style={[styles.image, { aspectRatio }]}
            resizeMode="contain"
            accessibilityLabel="Microscopy image"
            onLoad={(event): void => {
              const { width, height } = event.nativeEvent.source;
              if (width > 0 && height > 0) {
                setAspectRatio(width / height);
                setImageSize({ width, height });
              }
            }}
            onError={(): void => setHasImageError(true)}
          />
          {isOverlayReady && imageSize && containerSize && (
            <ResultBoundingBoxOverlay
              boxes={boxes}
              imageSize={imageSize}
              containerSize={containerSize}
            />
          )}
        </View>
      ) : (
        <Text style={styles.message}>
          Microscopy image unavailable. Connect and pull down to refresh.
        </Text>
      )}
      {isOverlayReady && (
        <View style={styles.legend} accessibilityLabel={`${legendText}. ${accessibleSummary}`}>
          <Text style={styles.legendSummary}>{legendText}</Text>
          <View style={styles.legendChips}>
            {buildParticleLegend(boxes).map((item) => (
              <View key={item.particleType} style={styles.legendChip}>
                <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                <Text style={styles.legendChipText}>{item.label}</Text>
                {item.count > 1 && <Text style={styles.legendChipCount}> ({item.count})</Text>}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function buildLegendText(boxes: ImageBox[]): string {
  const sources = [...new Set(boxes.map((box) => SOURCE_LABELS[box.source]))];
  const noun = boxes.length === 1 ? 'annotation' : 'annotations';
  return `${boxes.length} ${noun} · ${sources.join(', ')}`;
}

interface ParticleLegendEntry {
  particleType: string;
  label: string;
  color: string;
  count: number;
}

/**
 * @description Groups boxes by particle type into one swatch-legend entry each, so
 * repeated detections of the same particle share a single colored chip instead of
 * one per box.
 * @param boxes - Mapped boxes shown on the current image.
 */
function buildParticleLegend(boxes: ImageBox[]): ParticleLegendEntry[] {
  const entries = new Map<string, ParticleLegendEntry>();
  for (const box of boxes) {
    const existing = entries.get(box.particleType);
    entries.set(box.particleType, {
      particleType: box.particleType,
      label: box.label,
      color: getParticleColor(box.particleType),
      count: (existing?.count ?? 0) + 1,
    });
  }
  return [...entries.values()];
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
  imageWrapper: { position: 'relative' },
  image: {
    width: '100%',
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
  },
  message: { ...typography.body, color: colors.gray500 },
  legend: { marginTop: spacing.sm },
  legendSummary: { ...typography.caption, color: colors.gray500 },
  legendChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  legendChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  legendSwatch: {
    width: LEGEND_SWATCH_SIZE,
    height: LEGEND_SWATCH_SIZE,
    borderRadius: radius.xs,
  },
  legendChipText: { ...typography.caption, color: colors.ink },
  legendChipCount: { ...typography.caption, color: colors.gray500 },
});
