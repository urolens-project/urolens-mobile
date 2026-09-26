import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, fontWeight, radius, spacing } from '@src/theme';

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
 * @description The Queue header's brand row, title/count row, and date/role/username
 * row — everything above the wave background except the decoration.
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
    <Animated.View style={[styles.content, { paddingTop: topInset + 10 }, style]}>
      {/* Brand row */}
      <View style={styles.brandRow}>
        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <Icon name="flask" size={18} color={colors.white} />
          </View>
          <View>
            <Text style={styles.appName}>UroLens</Text>
            <Text style={styles.appSub}>Laboratory Diagnostics</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <QueueHeaderSyncButton
            syncing={syncing}
            syncDisabled={syncDisabled}
            reduceMotion={reduceMotion}
            onSync={onSync}
          />
          <TouchableOpacity style={styles.iconBtn} accessibilityLabel="Notifications">
            <View>
              <Icon name="notifications-outline" size={20} color={colors.white} />
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
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
  },
  appSub: {
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19, // Half of width/height above — computed circle radius.
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
    borderRadius: 4, // Half of width/height above — computed circle radius.
    backgroundColor: colors.red500,
    borderWidth: 1.5,
    borderColor: colors.teal,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.smd,
    marginTop: 18, // TODO(theme): between spacing.lg(16)/xl(20); left exact.
  },
  title: {
    flexShrink: 1,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
  },
  countPill: {
    flexShrink: 0,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 9, // TODO(theme): between spacing.sm(8)/smd(10); left exact.
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
  },
  countText: {
    fontSize: 11.5, // TODO(theme): fractional size, no token.
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  date: {
    fontSize: 13,
    fontWeight: fontWeight.medium,
    color: 'rgba(255,255,255,0.9)',
  },
  roleBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.smd,
    paddingVertical: 3, // TODO(theme): between spacing.xxs(2)/xs(4); left exact.
    borderRadius: radius.lg,
  },
  roleText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.teal,
  },
  username: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
