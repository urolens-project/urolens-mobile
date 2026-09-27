import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { colors, spacing, typography } from '@src/theme';

/**
 * @description Persistent banner telling the medtech they're offline and changes
 * will sync once connectivity returns. Renders nothing while online.
 */
export function OfflineBanner(): React.JSX.Element | null {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Offline Mode — Changes will sync when connected</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.amberBrown,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  text: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '500',
  },
});
