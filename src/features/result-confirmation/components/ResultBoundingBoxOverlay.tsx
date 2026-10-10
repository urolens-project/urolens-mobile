import { StyleSheet, View } from 'react-native';

import { radius } from '@src/theme';

import { BOX_BORDER_WIDTH, getParticleColor } from '../constants/particleAnnotation.constant';
import { projectPercentBox, type ImageDisplaySize } from '../lib/imageBoxGeometry';
import type { ImageBox } from '../types';

export interface ResultBoundingBoxOverlayProps {
  boxes: ImageBox[];
  imageSize: ImageDisplaySize;
  containerSize: ImageDisplaySize;
}

/**
 * @description Draws AI detections and reviewer boxes over the displayed microscopy
 * image as plain rectangles — no floating label, so a box never covers the particle
 * it marks. Particle names and colors live in the legend below the image instead
 * (see ResultImagePanel). A pure renderer: the caller owns image-load/layout
 * readiness and only passes boxes once both sizes are known.
 * @param boxes - Mapped boxes with percentage geometry and attribution.
 * @param imageSize - Natural pixel size of the loaded image.
 * @param containerSize - Measured size of the image's display area.
 */
export function ResultBoundingBoxOverlay({
  boxes,
  imageSize,
  containerSize,
}: ResultBoundingBoxOverlayProps): React.JSX.Element {
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {boxes.map((box) => {
        const rect = projectPercentBox(box, imageSize, containerSize);
        if (!rect) return null;
        const color = getParticleColor(box.particleType);
        return (
          <View
            key={box.renderKey}
            testID={`imageBox:${box.renderKey}`}
            style={[
              styles.box,
              box.source !== 'AI' && styles.boxReviewer,
              { ...rect, borderColor: color },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: BOX_BORDER_WIDTH,
    borderRadius: radius.xs,
  },
  boxReviewer: { borderStyle: 'dashed' },
});
