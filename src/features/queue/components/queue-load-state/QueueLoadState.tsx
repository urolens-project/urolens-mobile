import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { QueueEmptyState } from './QueueEmptyState';
import { QUEUE_TEXT } from '../../constants/queueText.constant';
import type { FilterOption } from '../../types';

export interface QueueLoadStateProps {
  isLoading: boolean;
  error: Error | null;
  hasItems?: boolean;
  hasActiveSamples?: boolean;
  isOnline: boolean;
  filter: FilterOption;
  reduceMotion: boolean;
  onRetry: () => Promise<void>;
}

/**
 * @description Distinguishes loading and failures from an empty queue while preserving cached work.
 * @param props - Load state, active filter and the retry action.
 */
export function QueueLoadState({
  isLoading,
  error,
  hasItems = false,
  hasActiveSamples,
  isOnline,
  filter,
  reduceMotion,
  onRetry,
}: QueueLoadStateProps): React.JSX.Element | null {
  if (error) {
    const message = hasItems
      ? QUEUE_TEXT.loadState.errorWithCache
      : QUEUE_TEXT.loadState.errorNoCache;
    return (
      <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Icon name="alert-circle-outline" color={colors.red700} />
        <Text style={styles.title}>{QUEUE_TEXT.loadState.errorTitle}</Text>
        <Text style={styles.message}>{message}</Text>
        <Pressable
          style={styles.button}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={QUEUE_TEXT.loadState.retryAccessibilityLabel}
        >
          <Text style={styles.buttonText}>{QUEUE_TEXT.loadState.retryButton}</Text>
        </Pressable>
      </View>
    );
  }
  if (hasItems) return null;
  if (isLoading) {
    return (
      <View style={styles.container} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.teal} />
        <Text style={styles.message}>{QUEUE_TEXT.loadState.loading}</Text>
      </View>
    );
  }
  const emptyFilter = hasActiveSamples === false ? 'ALL' : filter;
  return <QueueEmptyState isOnline={isOnline} filter={emptyFilter} reduceMotion={reduceMotion} />;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.xxl, gap: spacing.md },
  title: { ...typography.title, color: colors.gray900 },
  message: { ...typography.bodyLg, color: colors.gray700, textAlign: 'center' },
  button: { backgroundColor: colors.teal, padding: spacing.md, borderRadius: radius.sm },
  buttonText: { ...typography.label, color: colors.white },
});
