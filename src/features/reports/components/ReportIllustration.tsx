import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { REPORT_CATEGORY_STYLES } from '../constants';
import { REPORT_CATEGORY_ORDER } from '../types';
import type { ReportCategory } from '../types';

import { Dot } from './illustrationParts';
import { ApprovedScene, PendingScene, RejectedScene, ReleasedScene } from './illustrationScenes';

export const ILLUSTRATION_SIZE = 124;

export interface ReportIllustrationProps {
  category: ReportCategory;
  // Gentle idle bob. Turned off for reduced motion.
  animate?: boolean;
}

/**
 * @description Small decorative illustration for a report category card: a lab-report
 * sheet (or test tube for rejections) with an icon badge and a gentle idle bob animation.
 * @param category - Which report category's scene to render.
 * @param animate - Plays the idle bob animation; disable for reduced motion.
 */
export function ReportIllustration({
  category,
  animate = true,
}: ReportIllustrationProps): React.JSX.Element {
  const { color, blob } = REPORT_CATEGORY_STYLES[category];
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    // Offset each category so the four illustrations don't bob in unison.
    const phase = REPORT_CATEGORY_ORDER.indexOf(category) * 260;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 2200,
          delay: phase,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, category, bob]);

  const bobStyle = {
    transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [-3, 3] }) }],
  };

  return (
    <Animated.View
      style={[styles.box, bobStyle]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.disc, { backgroundColor: blob }]} />
      <Dot size={26} color={blob} style={{ position: 'absolute', top: 0, left: 6, opacity: 0.7 }} />

      {category === 'PENDING_APPROVAL' && <PendingScene color={color} blob={blob} />}
      {category === 'APPROVED' && <ApprovedScene color={color} />}
      {category === 'RELEASED' && <ReleasedScene color={color} />}
      {category === 'REJECTED' && <RejectedScene color={color} blob={blob} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: ILLUSTRATION_SIZE,
    height: ILLUSTRATION_SIZE,
  },
  disc: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
});
