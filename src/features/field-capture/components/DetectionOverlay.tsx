import { StyleSheet, View } from 'react-native';

import { radius } from '@src/theme';

import { getParticleColor } from '../lib/particleColor';
import type { Detection } from '../types';

export interface DetectionOverlayProps {
  detections: Detection[];
}

/**
 * @description Draws the AI's bounding boxes over a field's image, read-only — box
 * editing is a web-only action in the multi-field workflow (SDD Module 2 proposal,
 * section 3.4). Boxes are percent (0-100) of the image, so this overlay must be
 * rendered as an absolutely-positioned sibling of an Image sized to its container.
 * Hollow outline, no fill, no label — identification is the color legend's job
 * (ParticleLegend), since a crowded field makes inline labels illegible anyway
 * (field-post-analysis-report.md, Section 2 items 1-2).
 * @param detections - AI boxes for the currently displayed field.
 */
export function DetectionOverlay({ detections }: DetectionOverlayProps): React.JSX.Element {
  return (
    <View style={styles.container} pointerEvents="none">
      {detections.map((detection) => (
        <View
          key={detection.id}
          style={[
            styles.box,
            {
              left: `${detection.x}%`,
              top: `${detection.y}%`,
              width: `${detection.w}%`,
              height: `${detection.h}%`,
              borderColor: getParticleColor(detection.particleType),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  box: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: radius.xs,
    backgroundColor: 'transparent',
  },
});
