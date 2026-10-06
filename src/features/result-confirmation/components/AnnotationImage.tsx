import { useCallback, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

import { DEFAULT_IMAGE_ASPECT_RATIO, MIN_ANNOTATION_SIZE } from '../constants/annotation.constant';
import { boxFromPoints, moveAnnotation } from '../lib/spatialAnnotations';
import type { SpatialAnnotation } from '../types';

type EditMode = 'draw' | 'move' | 'resize';
interface ImageGesture {
  box: SpatialAnnotation;
  x: number;
  y: number;
  pageX: number;
  pageY: number;
}

export interface AnnotationImageProps {
  imageUrl: string | null;
  boxes: SpatialAnnotation[];
  otherBoxes: SpatialAnnotation[];
  particleType: string;
  selectedId: string | null;
  mode: EditMode;
  isEditable: boolean;
  onChange: (boxes: SpatialAnnotation[]) => void;
  onSelect: (id: string) => void;
}

/**
 * @description Displays the full microscopy image and draws, moves or resizes percentage-based boxes.
 * @param props - Image, attributed boxes and editor callbacks.
 */
export function AnnotationImage({
  imageUrl,
  boxes,
  otherBoxes,
  particleType,
  selectedId,
  mode,
  isEditable,
  onChange,
  onSelect,
}: AnnotationImageProps): React.JSX.Element {
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_IMAGE_ASPECT_RATIO);
  const [hasImageError, setHasImageError] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [preview, setPreview] = useState<SpatialAnnotation | null>(null);
  const size = useRef({ width: 0, height: 0 });
  const gesture = useRef<ImageGesture | null>(null);
  const latestPreview = useRef<SpatialAnnotation | null>(null);
  const sequence = useRef(0);

  const handleLayout = useCallback((event: LayoutChangeEvent): void => {
    size.current = event.nativeEvent.layout;
  }, []);
  const handleStart = useCallback(
    (event: GestureResponderEvent): void => {
      if (!isEditable || !isImageLoaded || !size.current.width || !size.current.height) return;
      const { locationX, locationY, pageX, pageY } = event.nativeEvent;
      const x = (locationX / size.current.width) * 100;
      const y = (locationY / size.current.height) * 100;
      const selected = boxes.find((box): boolean => box.id === selectedId);
      if (mode !== 'draw' && !selected) return;
      sequence.current += 1;
      const box =
        mode === 'draw'
          ? { id: `box-${Date.now()}-${sequence.current}`, x, y, w: 0, h: 0, particleType }
          : selected!;
      gesture.current = { box, x, y, pageX, pageY };
      latestPreview.current = box;
      setPreview(box);
    },
    [boxes, isEditable, isImageLoaded, mode, particleType, selectedId],
  );
  const handleMove = useCallback(
    (event: GestureResponderEvent): void => {
      const active = gesture.current;
      if (!active) return;
      const dx = ((event.nativeEvent.pageX - active.pageX) / size.current.width) * 100;
      const dy = ((event.nativeEvent.pageY - active.pageY) / size.current.height) * 100;
      let next: SpatialAnnotation;
      if (mode === 'move') next = moveAnnotation(active.box, { x: dx, y: dy });
      else if (mode === 'resize')
        next = {
          ...active.box,
          ...boxFromPoints(active.box, {
            x: active.box.x + active.box.w + dx,
            y: active.box.y + active.box.h + dy,
          }),
        };
      else
        next = { ...active.box, ...boxFromPoints(active, { x: active.x + dx, y: active.y + dy }) };
      latestPreview.current = next;
      setPreview(next);
    },
    [mode],
  );
  const handleEnd = useCallback((): void => {
    const next = latestPreview.current;
    if (next && next.w >= MIN_ANNOTATION_SIZE && next.h >= MIN_ANNOTATION_SIZE) {
      onChange([...boxes.filter((box): boolean => box.id !== next.id), next]);
      onSelect(next.id);
    }
    gesture.current = null;
    latestPreview.current = null;
    setPreview(null);
  }, [boxes, onChange, onSelect]);
  const handleCancel = useCallback((): void => {
    gesture.current = null;
    latestPreview.current = null;
    setPreview(null);
  }, []);

  if (!imageUrl || hasImageError) {
    return (
      <Text style={styles.message}>
        Microscopy image unavailable. Connect and reload the result to try again.
      </Text>
    );
  }
  const visibleBoxes = [...otherBoxes, ...boxes.filter((box): boolean => box.id !== preview?.id)];
  if (preview) visibleBoxes.push(preview);
  return (
    <View
      testID="annotation-image"
      style={[styles.container, { aspectRatio }]}
      onLayout={handleLayout}
      onStartShouldSetResponder={(): boolean => isEditable && isImageLoaded}
      onResponderGrant={handleStart}
      onResponderMove={handleMove}
      onResponderRelease={handleEnd}
      onResponderTerminate={handleCancel}
      onResponderTerminationRequest={(): boolean => false}
      accessibilityLabel="Microscopy image with spatial annotations"
    >
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="contain"
          onLoad={(event): void => {
            const { width, height } = event.nativeEvent.source;
            if (width > 0 && height > 0) setAspectRatio(width / height);
            setIsImageLoaded(true);
          }}
          onError={(): void => setHasImageError(true)}
          accessibilityLabel="Microscopy image"
        />
        {visibleBoxes.map(
          (box): React.JSX.Element => (
            <View
              key={box.id}
              style={[
                styles.box,
                box.id === selectedId && styles.boxSelected,
                {
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.w}%`,
                  height: `${box.h}%`,
                },
              ]}
            >
              <Text style={styles.boxLabel}>{box.particleType.replace(/_/g, ' ')}</Text>
            </View>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.gray100,
    overflow: 'hidden',
    borderRadius: radius.md,
  },
  image: { width: '100%', height: '100%' },
  box: { position: 'absolute', borderWidth: 1, borderColor: colors.teal },
  boxSelected: { borderWidth: 2, borderColor: colors.amber600 },
  boxLabel: { ...typography.micro, color: colors.white, backgroundColor: colors.teal },
  message: { ...typography.body, color: colors.gray500, padding: spacing.md },
});
