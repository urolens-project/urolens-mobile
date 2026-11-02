import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@src/theme';

import type { Detection } from '../types';

export interface DetectionOverlayProps {
  detections: Detection[];
}

/**
 * @description Draws the AI's bounding boxes over a field's image, read-only — box
 * editing is a web-only action in the multi-field workflow (SDD Module 2 proposal,
 * section 3.4). Boxes are percent (0-100) of the image, so this overlay must be
 * rendered as an absolutely-positioned sibling of an Image sized to its container.
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
            },
          ]}
        >
          <Text style={styles.label} numberOfLines={1}>
            {detection.particleType}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  box: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: colors.tealAlt,
    borderRadius: radius.xs,
  },
  label: {
    ...typography.tiny,
    color: colors.white,
    backgroundColor: colors.tealAlt,
    alignSelf: 'flex-start',
    paddingHorizontal: 3,
  },
});
