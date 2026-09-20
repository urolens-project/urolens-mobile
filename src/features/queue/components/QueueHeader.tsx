import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { HeaderWaves, QUEUE_WAVES } from '@components/HeaderWaves';

// A little taller than the Reports landing header (172): the waves here move all the
// time, sliding the curve up toward the text at its extremes, so the text needs the room.
export const QUEUE_HEADER_BODY_HEIGHT = 188;

interface Props {
  username: string | null;
  activeCount: number;
  // Today's date at the clinic, already formatted.
  dateLabel: string;
  // Safe-area top inset — the header draws under the status bar.
  topInset: number;
  // Changes each time the screen is entered, replaying the entrance.
  playKey: number;
  reduceMotion: boolean;
  // Ambient motion (rising bubbles) runs only while the tab is in view.
  live: boolean;
  syncing: boolean;
  syncDisabled: boolean;
  onSync: () => void;
}

// ── Header circles ───────────────────────────────────────────────────────────
// Two kinds, both moving forever with no dead time. Each starts at its own point in
// its cycle (`phase`) — so the header is already full of motion the moment it shows,
// not building up from empty — and every one runs on its own rhythm, so they never
// fall into step. All native-driver transforms and opacity.

// Big soft circles that wander in place and breathe. x / y are shares of the header's
// width / height.
const FLOATERS = [
  { x: 0.05, y: 0.2, size: 32, driftX: 16, driftY: 12, duration: 6200, phase: 0.1, alpha: 0.14 },
  { x: 0.33, y: 0.05, size: 16, driftX: 10, driftY: 14, duration: 7400, phase: 0.6, alpha: 0.22 },
  { x: 0.55, y: 0.3, size: 26, driftX: 18, driftY: 10, duration: 5600, phase: 0.35, alpha: 0.13 },
  { x: 0.8, y: 0.08, size: 13, driftX: 8, driftY: 12, duration: 6800, phase: 0.8, alpha: 0.24 },
  { x: 0.92, y: 0.36, size: 22, driftX: 12, driftY: 14, duration: 8000, phase: 0.5, alpha: 0.14 },
] as const;

// Small bubbles that rise from the bottom of the header and fade out at the top.
const RISERS = [
  { x: 0.08, size: 8, duration: 5200, phase: 0.2 },
  { x: 0.24, size: 12, duration: 6400, phase: 0.75 },
  { x: 0.42, size: 6, duration: 4800, phase: 0.45 },
  { x: 0.63, size: 10, duration: 5800, phase: 0.05 },
  { x: 0.78, size: 7, duration: 5000, phase: 0.6 },
  { x: 0.9, size: 9, duration: 6000, phase: 0.35 },
] as const;

// An endless there-and-back 0 → 1 → 0. The loop doesn't reset between rounds, so it never
// jumps, and it can start at any phase. Held still at its phase when not active.
function useOscillation(active: boolean, duration: number, phase: number) {
  const value = useRef(new Animated.Value(phase)).current;

  useEffect(() => {
    if (!active) {
      value.setValue(phase);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: false },
    );
    loop.start();
    return () => loop.stop();
  }, [active, duration, phase, value]);

  return value;
}

// An endless climb 0 → 1, snapping back to 0 (out of sight — it has faded to nothing by
// then) to go again.
function useClimb(active: boolean, duration: number, phase: number) {
  const value = useRef(new Animated.Value(phase)).current;

  useEffect(() => {
    if (!active) {
      value.setValue(phase);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
      { resetBeforeIteration: false },
    );
    loop.start();
    return () => loop.stop();
  }, [active, duration, phase, value]);

  return value;
}

function FloatingCircle({
  x,
  y,
  size,
  driftX,
  driftY,
  duration,
  phase,
  alpha,
  width,
  height,
  active,
}: (typeof FLOATERS)[number] & { width: number; height: number; active: boolean }) {
  // Sideways and vertical wander run on different periods, tracing a slow loop rather
  // than a straight back-and-forth.
  const sway = useOscillation(active, duration, phase);
  const bob = useOscillation(active, duration * 1.35, 1 - phase);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: width * x,
        top: height * y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FFFFFF',
        opacity: bob.interpolate({ inputRange: [0, 1], outputRange: [alpha * 0.55, alpha * 1.3] }),
        transform: [
          { translateX: sway.interpolate({ inputRange: [0, 1], outputRange: [-driftX, driftX] }) },
          { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [-driftY, driftY] }) },
          { scale: bob.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) },
        ],
      }}
    />
  );
}

function RisingBubble({
  x,
  size,
  duration,
  phase,
  width,
  travel,
  bottom,
  active,
}: (typeof RISERS)[number] & { width: number; travel: number; bottom: number; active: boolean }) {
  const rise = useClimb(active, duration, phase);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: width * x,
        bottom,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255,255,255,0.32)',
        opacity: rise.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, 0.9, 0.5, 0] }),
        transform: [
          { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, -travel] }) },
          {
            translateX: rise.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 7, -5] }),
          },
        ],
      }}
    />
  );
}

export function QueueHeader({
  username,
  activeCount,
  dateLabel,
  topInset,
  playKey,
  reduceMotion,
  live,
  syncing,
  syncDisabled,
  onSync,
}: Props) {
  const { width } = useWindowDimensions();
  const height = topInset + QUEUE_HEADER_BODY_HEIGHT;
  // Everything that moves on its own runs only while the tab is in view and motion is allowed.
  const animate = live && !reduceMotion;

  const enter = useRef(new Animated.Value(0)).current;
  const enterBack = useRef(new Animated.Value(0)).current;
  const lens = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      enter.setValue(1);
      enterBack.setValue(1);
      lens.setValue(1);
      return;
    }

    enter.setValue(0);
    enterBack.setValue(0);
    lens.setValue(0);

    // The waves flow down (the back one a beat behind), then the microscope settles.
    const run = Animated.parallel([
      Animated.spring(enter, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(110),
        Animated.spring(enterBack, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(300),
        Animated.spring(lens, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
      ]),
    ]);
    run.start();
    return () => run.stop();
  }, [playKey, reduceMotion, enter, enterBack, lens]);

  // The sync icon turns for as long as a sync is running.
  useEffect(() => {
    spin.setValue(0);
    if (!syncing || reduceMotion) return;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [syncing, reduceMotion, spin]);

  const contentStyle = {
    opacity: enter.interpolate({
      inputRange: [0.35, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };
  const decorStyle = {
    opacity: enter.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
  };
  const lensStyle = {
    opacity: lens.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [
      { rotate: lens.interpolate({ inputRange: [0, 1], outputRange: ['12deg', '0deg'] }) },
      { scale: lens.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
    ],
  };
  const spinStyle = {
    transform: [
      { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
    ],
  };

  const syncColor = syncDisabled ? 'rgba(255,255,255,0.45)' : '#FFFFFF';

  return (
    <View style={[styles.wrap, { width, height }]}>
      <HeaderWaves
        width={width}
        height={height}
        preset={QUEUE_WAVES}
        topInset={topInset}
        enter={enter}
        enterBack={enterBack}
        flow={animate}
      />

      {/* Decoration: drifting circles, rising bubbles and a faint microscope — the lab motif. */}
      <Animated.View style={[StyleSheet.absoluteFill, decorStyle]} pointerEvents="none">
        {FLOATERS.map((circle) => (
          <FloatingCircle
            key={circle.x}
            {...circle}
            width={width}
            height={height}
            active={animate}
          />
        ))}
        {RISERS.map((bubble) => (
          <RisingBubble
            key={bubble.x}
            {...bubble}
            width={width}
            travel={height - topInset - 60}
            bottom={34}
            active={animate}
          />
        ))}
      </Animated.View>
      <Animated.View
        style={[styles.microscope, { top: topInset + 62 }, lensStyle]}
        pointerEvents="none"
      >
        <MaterialCommunityIcons name="microscope" size={96} color="rgba(255,255,255,0.16)" />
      </Animated.View>

      <Animated.View style={[styles.content, { paddingTop: topInset + 10 }, contentStyle]}>
        {/* Brand row */}
        <View style={styles.brandRow}>
          <View style={styles.brand}>
            <View style={styles.logoBox}>
              <Ionicons name="flask" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.appName}>UroLens</Text>
              <Text style={styles.appSub}>Laboratory Diagnostics</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.iconBtn}
              accessibilityLabel="Sync"
              onPress={onSync}
              disabled={syncDisabled}
            >
              <Animated.View style={spinStyle}>
                <Ionicons name="sync-outline" size={20} color={syncColor} />
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} accessibilityLabel="Notifications">
              <View>
                <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
                <View style={styles.notifDot} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title row */}
        <View style={styles.titleRow}>
          <Text
            style={styles.title}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            accessibilityRole="header"
          >
            My Sample Queue
          </Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{activeCount} Active Samples</Text>
          </View>
        </View>

        {/* Who and when */}
        <View style={styles.metaRow}>
          <Text style={styles.date}>{dateLabel}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Medical Technologist</Text>
          </View>
          {username && (
            <Text style={styles.username} numberOfLines={1}>
              {username}
            </Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  microscope: {
    position: 'absolute',
    right: 14,
  },
  content: {
    paddingHorizontal: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  appSub: {
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#2E7D7A',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 18,
  },
  title: {
    flexShrink: 1,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  countPill: {
    flexShrink: 0,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
  },
  countText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  date: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  roleBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D7A',
  },
  username: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
