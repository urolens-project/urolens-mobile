import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { REPORT_CATEGORY_STYLES } from '../constants';
import { REPORT_CATEGORY_ORDER } from '../types';
import type { ReportCategory } from '../types';

export const ILLUSTRATION_SIZE = 124;

interface Props {
  category: ReportCategory;
  // Gentle idle bob. Turned off for reduced motion.
  animate?: boolean;
}

// ─── Building blocks ─────────────────────────────────────────────────────────
// Everything here is plain Views + vector icons: no SVG dependency, so no
// native rebuild is needed for it.

// A teardrop: a square with three rounded corners, turned 45° so the sharp
// corner points up. The urinalysis motif shared by every illustration.
function Droplet({ size, color, style }: { size: number; color: string; style?: object }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: size / 2,
          borderTopLeftRadius: 0,
          transform: [{ rotate: '45deg' }],
        },
        style,
      ]}
    />
  );
}

function Dot({ size, color, style }: { size: number; color: string; style?: object }) {
  return (
    <View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}

// A lab report sheet: title bar, text lines, and a little result bar chart.
function Paper({ accent }: { accent: string }) {
  return (
    <View style={styles.paper}>
      <View style={[styles.paperTitle, { backgroundColor: accent }]} />
      <View style={[styles.paperLine, { width: 44, top: 27 }]} />
      <View style={[styles.paperLine, { width: 44, top: 37 }]} />
      <View style={[styles.paperLine, { width: 28, top: 47 }]} />
      <View style={styles.paperBars}>
        <View style={[styles.paperBar, { height: 10, backgroundColor: accent, opacity: 0.55 }]} />
        <View style={[styles.paperBar, { height: 20, backgroundColor: accent }]} />
        <View style={[styles.paperBar, { height: 14, backgroundColor: accent, opacity: 0.75 }]} />
      </View>
    </View>
  );
}

function Badge({
  icon,
  color,
  iconSize,
  style,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
  iconSize: number;
  style?: object;
}) {
  return (
    <View style={[styles.badge, style]}>
      <MaterialCommunityIcons name={icon} size={iconSize} color={color} />
    </View>
  );
}

// ─── Scenes ──────────────────────────────────────────────────────────────────

// Report awaiting a supervisor: the sheet with an hourglass.
function PendingScene({ color, blob }: { color: string; blob: string }) {
  return (
    <>
      <Paper accent={color} />
      <Badge icon="timer-sand" color={color} iconSize={24} style={styles.badgeBottomRight} />
      <Droplet size={12} color={blob} style={{ position: 'absolute', top: 8, right: 16 }} />
      <Droplet
        size={8}
        color={color}
        style={{ position: 'absolute', top: 30, right: 3, opacity: 0.5 }}
      />
    </>
  );
}

// Report approved: the sheet with an approval seal.
function ApprovedScene({ color }: { color: string }) {
  return (
    <>
      <Paper accent={color} />
      <Badge icon="check-decagram" color={color} iconSize={32} style={styles.badgeBottomRight} />
      <MaterialCommunityIcons
        name="star-four-points"
        size={16}
        color={color}
        style={{ position: 'absolute', top: 6, right: 12, opacity: 0.8 }}
      />
      <MaterialCommunityIcons
        name="star-four-points"
        size={10}
        color={color}
        style={{ position: 'absolute', top: 30, right: 2, opacity: 0.55 }}
      />
    </>
  );
}

// Report released: the sheet with a paper plane flying off it.
function ReleasedScene({ color }: { color: string }) {
  return (
    <>
      <Paper accent={color} />
      <Badge
        icon="send"
        color={color}
        iconSize={22}
        style={[styles.badgeTopRight, { transform: [{ rotate: '-22deg' }] }]}
      />
      <Dot
        size={5}
        color={color}
        style={{ position: 'absolute', top: 44, right: 44, opacity: 0.6 }}
      />
      <Dot
        size={4}
        color={color}
        style={{ position: 'absolute', top: 53, right: 36, opacity: 0.45 }}
      />
      <Dot
        size={3}
        color={color}
        style={{ position: 'absolute', top: 60, right: 30, opacity: 0.3 }}
      />
    </>
  );
}

// Specimen rejected: a test tube with a cross, and the sample spilling.
function RejectedScene({ color, blob }: { color: string; blob: string }) {
  return (
    <>
      <MaterialCommunityIcons name="test-tube" size={78} color={color} style={styles.tube} />
      <Badge icon="close-circle" color={color} iconSize={30} style={styles.badgeBottomRight} />
      <Droplet size={11} color={color} style={{ position: 'absolute', top: 88, left: 22 }} />
      <Droplet size={7} color={blob} style={{ position: 'absolute', top: 100, left: 40 }} />
    </>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReportIllustration({ category, animate = true }: Props) {
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
  paper: {
    position: 'absolute',
    top: 20,
    left: 26,
    width: 64,
    height: 82,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-6deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  paperTitle: {
    position: 'absolute',
    top: 11,
    left: 10,
    width: 30,
    height: 6,
    borderRadius: 3,
  },
  paperLine: {
    position: 'absolute',
    left: 10,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  paperBars: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  paperBar: {
    width: 7,
    borderRadius: 2,
  },
  badge: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  badgeBottomRight: {
    right: 2,
    bottom: 4,
  },
  badgeTopRight: {
    right: 2,
    top: 6,
  },
  tube: {
    position: 'absolute',
    top: 14,
    left: 24,
    transform: [{ rotate: '22deg' }],
  },
});
