import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { colors } from '@src/theme';

export interface LoadingOverlayProps {
  visible: boolean;
}

/**
 * @description Full-screen dimmed overlay with a spinner, shown while a blocking
 * action is in flight.
 * @param visible - Renders nothing when false.
 */
export function LoadingOverlay({ visible }: LoadingOverlayProps): React.JSX.Element | null {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color={colors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});
