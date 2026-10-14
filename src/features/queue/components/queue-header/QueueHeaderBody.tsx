import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { QueueHeaderSyncButton } from './QueueHeaderSyncButton';

export interface QueueHeaderBodyProps {
  username: string | null;
  activeCount: number;
  /** Today's date at the clinic, already formatted. */
  dateLabel: string;
  /** Safe-area top inset — the content sits below the status bar. */
  topInset: number;
  /** Fades/slides the whole block in with the header's entrance animation. */
  style?: StyleProp<ViewStyle>;
  syncing: boolean;
  syncDisabled: boolean;
  reduceMotion: boolean;
  onSync: () => void;
}

/**
 * @description Keeps queue context and actions in two compact rows so samples have
 * more room on screen.
 * @param props - Queue totals, user/date context, safe area and sync controls.
 */
export function QueueHeaderBody({
  username,
  activeCount,
  dateLabel,
  topInset,
  style,
  syncing,
  syncDisabled,
  reduceMotion,
  onSync,
}: QueueHeaderBodyProps): React.JSX.Element {
  return (
    <Animated.View style={[styles.container, { paddingTop: topInset + spacing.sm }, style]}>
      <View style={styles.titleRow}>
        <View style={styles.heading}>
          <View style={styles.brandRow}>
            <Icon name="flask" size={spacing.md} color={colors.white} />
            <Text style={styles.appName}>UroLens</Text>
            <Text style={styles.appSubtitle} numberOfLines={1}>
              Laboratory Diagnostics
            </Text>
          </View>
          <Text
            style={styles.title}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            accessibilityRole="header"
          >
            My Sample Queue
          </Text>
        </View>
        <View style={styles.actions}>
          <QueueHeaderSyncButton
            syncing={syncing}
            syncDisabled={syncDisabled}
            reduceMotion={reduceMotion}
            onSync={onSync}
          />
          <TouchableOpacity
            style={styles.iconButton}
            accessibilityLabel="Notifications"
            accessibilityRole="button"
          >
            <View>
              <Icon name="notifications-outline" size={20} color={colors.white} />
              <View style={styles.notificationDot} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.summary}>
          <Text style={styles.countText}>{activeCount} Active Samples</Text>
          <Text style={styles.role} numberOfLines={1}>
            Medical Technologist
          </Text>
        </View>
        <View style={styles.context}>
          <Text style={styles.date} numberOfLines={1}>
            {dateLabel}
          </Text>
          {username && (
            <Text style={styles.username} numberOfLines={1}>
              {username}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heading: {
    flex: 1,
    gap: spacing.xxs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  appName: {
    ...typography.micro,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  appSubtitle: {
    flexShrink: 1,
    ...typography.tiny,
    color: colors.white,
    opacity: 0.8,
  },
  title: {
    ...typography.titleLg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: spacing.jumbo - spacing.xs,
    height: spacing.jumbo - spacing.xs,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: -spacing.xxs,
    right: -spacing.xxs,
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.red500,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  countText: {
    ...typography.caption,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  summary: {
    flex: 1,
  },
  role: {
    ...typography.micro,
    color: colors.white,
    opacity: 0.85,
  },
  context: {
    flex: 1,
    alignItems: 'flex-end',
  },
  date: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.85,
  },
  username: {
    ...typography.caption,
    fontWeight: fontWeight.medium,
    color: colors.white,
    maxWidth: '100%',
  },
});
