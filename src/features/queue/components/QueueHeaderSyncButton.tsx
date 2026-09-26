import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, TouchableOpacity } from 'react-native';

import { colors } from '@src/theme';

import { Icon } from '@components/Icon';

export interface QueueHeaderSyncButtonProps {
  syncing: boolean;
  syncDisabled: boolean;
  reduceMotion: boolean;
  onSync: () => void;
}

/**
 * @description Sync icon button for the Queue header. The icon spins for as long as a
 * sync is running.
 * @param syncing - Whether a sync is currently in progress.
 * @param syncDisabled - Disables the button and dims the icon.
 * @param reduceMotion - Disables the spin animation.
 * @param onSync - Called when the button is pressed.
 */
export function QueueHeaderSyncButton({
  syncing,
  syncDisabled,
  reduceMotion,
  onSync,
}: QueueHeaderSyncButtonProps): React.JSX.Element {
  const spin = useRef(new Animated.Value(0)).current;

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

  const spinStyle = {
    transform: [
      { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
    ],
  };
  const syncColor = syncDisabled ? 'rgba(255,255,255,0.45)' : colors.white;

  return (
    <TouchableOpacity
      style={styles.iconBtn}
      accessibilityLabel="Sync"
      onPress={onSync}
      disabled={syncDisabled}
    >
      <Animated.View style={spinStyle}>
        <Icon name="sync-outline" size={20} color={syncColor} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19, // Half of width/height above — computed circle radius.
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
