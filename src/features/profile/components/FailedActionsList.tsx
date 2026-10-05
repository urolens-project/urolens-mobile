import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { useFailedActions } from '../hooks/useFailedActions';
import type { FailedActionUi } from '../types';
import { InfoRowSeparator } from './InfoRowSeparator';

/**
 * @description The changes made on this phone that the server refused, with the reason
 * for each, and a button to clear the list. Renders nothing when there are none.
 */
export function FailedActionsList(): React.JSX.Element | null {
  const { items, dismissAll, isDismissing } = useFailedActions();

  if (items.length === 0) return null;

  return (
    <View>
      <InfoRowSeparator />
      <View style={styles.header}>
        <Icon name="alert-circle-outline" size={18} color={colors.red600} />
        <Text style={styles.headerText}>
          {items.length === 1
            ? "1 change couldn't be sent"
            : `${items.length} changes couldn't be sent`}
        </Text>
        <TouchableOpacity
          style={[styles.dismissBtn, isDismissing && styles.dismissBtnDisabled]}
          onPress={dismissAll}
          disabled={isDismissing}
          accessibilityLabel="Dismiss changes that couldn't be sent"
          accessibilityRole="button"
        >
          <Text style={styles.dismissBtnText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.explanation}>
        The server did not accept these, so they were not saved. The app shows what the server has.
      </Text>
      {items.map((item) => (
        <FailedActionRow key={item.id} item={item} />
      ))}
    </View>
  );
}

interface FailedActionRowProps {
  item: FailedActionUi;
}

function FailedActionRow({ item }: FailedActionRowProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>
        {item.sampleUid ? `${item.title} • ${item.sampleUid}` : item.title}
      </Text>
      <Text style={styles.rowReason}>{item.reason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  headerText: {
    ...typography.bodyLg,
    flex: 1,
    color: colors.red600,
    fontWeight: fontWeight.semibold,
  },
  dismissBtn: {
    paddingHorizontal: spacing.mlg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.red50,
    borderWidth: 0.5,
    borderColor: colors.red200,
  },
  dismissBtnDisabled: {
    opacity: 0.5,
  },
  dismissBtnText: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.red600,
  },
  explanation: {
    ...typography.caption,
    color: colors.gray500,
    paddingVertical: spacing.sm,
  },
  row: {
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },
  rowTitle: {
    ...typography.body,
    color: colors.gray900,
    fontWeight: fontWeight.semibold,
  },
  rowReason: {
    ...typography.caption,
    color: colors.gray500,
  },
});
