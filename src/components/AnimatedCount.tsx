import React, { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

const DURATION_MS = 650;

interface Props {
  value: number;
  style?: StyleProp<TextStyle>;
  reduceMotion?: boolean;
}

// A number that counts up (or down) to a new value and gives a little pop when it
// changes, so live data visibly moves instead of jumping. The first render shows
// the value straight away; it only animates on a change.
export function AnimatedCount({ value, style, reduceMotion = false }: Props) {
  const [shown, setShown] = useState(value);
  // What's on screen right now, so a change that arrives mid-count continues from
  // there instead of restarting from the old number.
  const shownRef = useRef(value);
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (value === shownRef.current) return;
    if (reduceMotion) {
      shownRef.current = value;
      setShown(value);
      return;
    }

    const from = shownRef.current;
    const startedAt = Date.now();
    let frame = 0;

    pop.setValue(1.2);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();

    const tick = () => {
      const t = Math.min(1, (Date.now() - startedAt) / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (value - from) * eased);
      shownRef.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [value, reduceMotion, pop]);

  return <Animated.Text style={[style, { transform: [{ scale: pop }] }]}>{shown}</Animated.Text>;
}
