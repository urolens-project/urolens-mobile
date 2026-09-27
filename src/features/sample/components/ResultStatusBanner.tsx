import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon, type IconProps } from '@components/Icon';

type BannerVariant = 'rejected' | 'correction' | 'escalated' | 'pending' | 'approved' | 'released';

interface VariantStyle {
  icon: IconProps['name'];
  iconSize: number;
  iconColor: string;
  bg: string;
  border: string;
  titleColor: string;
  bodyColor: string;
}

const VARIANT_STYLES: Record<BannerVariant, VariantStyle> = {
  rejected: {
    icon: 'close-circle-outline',
    iconSize: 18,
    iconColor: colors.red700,
    bg: colors.red50,
    border: colors.red200,
    titleColor: colors.red700,
    bodyColor: colors.red800,
  },
  correction: {
    icon: 'alert-circle',
    iconSize: 18,
    iconColor: colors.amber800,
    bg: colors.amber50,
    border: colors.amber200,
    titleColor: colors.amber800,
    bodyColor: colors.amber700,
  },
  escalated: {
    icon: 'warning',
    iconSize: 18,
    iconColor: colors.red700,
    bg: colors.red50,
    border: colors.red200,
    titleColor: colors.red700,
    bodyColor: colors.red800,
  },
  pending: {
    icon: 'time-outline',
    iconSize: 16,
    iconColor: colors.blue800,
    bg: colors.blue50,
    border: colors.blue200,
    titleColor: colors.blue800,
    bodyColor: colors.blue800,
  },
  approved: {
    icon: 'checkmark-circle',
    iconSize: 18,
    iconColor: colors.emerald800,
    bg: colors.emerald50,
    border: colors.emerald200,
    titleColor: colors.emerald800,
    bodyColor: colors.emerald700,
  },
  released: {
    icon: 'send',
    iconSize: 16,
    iconColor: colors.emerald800,
    bg: colors.green50,
    border: colors.green200,
    titleColor: colors.emerald800,
    bodyColor: colors.emerald700,
  },
};

export interface ResultStatusBannerProps {
  variant: BannerVariant;
  title: string;
  /** Omit for a single-line banner (e.g. "pending"); provided banners render title + body. */
  body?: string;
}

/**
 * @description One shared visual for every analysis-result status callout (rejected,
 * returned for correction, escalated, awaiting approval, approved, released) — same
 * layout, colors keyed off `variant`.
 * @param variant - Which status this banner represents.
 * @param title - Bold headline text.
 * @param body - Optional supporting line; omitted renders a single-line banner.
 */
export function ResultStatusBanner({ variant, title, body }: ResultStatusBannerProps): React.JSX.Element {
  const v = VARIANT_STYLES[variant];
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: v.bg, borderColor: v.border },
        body === undefined && styles.bannerSingleLine,
      ]}
    >
      <Icon name={v.icon} size={v.iconSize} color={v.iconColor} />
      {body === undefined ? (
        <Text style={[styles.singleLineText, { color: v.titleColor }]}>{title}</Text>
      ) : (
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: v.titleColor }]}>{title}</Text>
          <Text style={[styles.body, { color: v.bodyColor }]}>{body}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.smd,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  bannerSingleLine: { alignItems: 'center', gap: spacing.sm },
  textBlock: { flex: 1, gap: spacing.xxs },
  title: { ...typography.body, fontWeight: fontWeight.bold },
  body: { ...typography.caption, lineHeight: 17 },
  singleLineText: { ...typography.body, fontWeight: fontWeight.medium, flex: 1 },
});
