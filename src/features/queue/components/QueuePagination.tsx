import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

import { QUEUE_PAGE_SIZE } from '../constants/queue.constant';

export interface QueuePaginationProps {
  page: number;
  pageCount: number;
  totalItems: number;
  onNext: () => void;
  onPrevious: () => void;
}

/**
 * @description Pages cached queue entries without changing the live totals or requiring connectivity.
 * @param props - Current page, filtered total and navigation callbacks.
 */
export function QueuePagination({
  page,
  pageCount,
  totalItems,
  onNext,
  onPrevious,
}: QueuePaginationProps): React.JSX.Element | null {
  const isPreviousDisabled = page <= 1;
  const isNextDisabled = page >= pageCount;
  const firstItem = (page - 1) * QUEUE_PAGE_SIZE + 1;
  const lastItem = Math.min(page * QUEUE_PAGE_SIZE, totalItems);
  if (totalItems === 0) return null;
  return (
    <View style={styles.container}>
      <Text style={styles.summary} accessibilityLiveRegion="polite">
        Showing {firstItem}–{lastItem} of {totalItems}
      </Text>
      {pageCount > 1 && (
        <View style={styles.controls}>
          <Pressable
            style={[styles.button, isPreviousDisabled && styles.buttonDisabled]}
            disabled={isPreviousDisabled}
            accessibilityRole="button"
            accessibilityLabel="Previous queue page"
            accessibilityState={{ disabled: isPreviousDisabled }}
            onPress={onPrevious}
          >
            <Text style={styles.buttonText}>Previous</Text>
          </Pressable>
          <Text style={styles.summary}>
            Page {page} of {pageCount}
          </Text>
          <Pressable
            style={[styles.button, isNextDisabled && styles.buttonDisabled]}
            disabled={isNextDisabled}
            accessibilityRole="button"
            accessibilityLabel="Next queue page"
            accessibilityState={{ disabled: isNextDisabled }}
            onPress={onNext}
          >
            <Text style={styles.buttonText}>Next</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.xxl, gap: spacing.md, alignItems: 'center' },
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  summary: { ...typography.body, color: colors.gray700 },
  button: { padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.teal },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { ...typography.label, color: colors.white },
});
