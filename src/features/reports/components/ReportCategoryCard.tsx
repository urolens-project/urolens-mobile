import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { REPORT_CATEGORY_STYLES } from '../constants';
import type { ReportCategory } from '../types';

interface Props {
  category: ReportCategory;
  title: string;
  count: number;
  onPress: (category: ReportCategory) => void;
}

// Full-width "stat row" card: a huge count on the left, the category name
// on the right. No icon, no color heading — the number's own color is the
// only category cue left, so it has to carry the card.
const CARD_HEIGHT = 96;
const NUMBER_FONT_SIZE = Math.round(CARD_HEIGHT * 0.9);
// A lineHeight tight against fontSize, combined with adjustsFontSizeToFit
// and a marginTop that pushed the line past the remaining container height,
// was making iOS collapse the whole number to nothing instead of just
// clipping it — this is why the count wasn't rendering at all. lineHeight
// now has real headroom above fontSize, and the top nudge is small enough
// that lineHeight + nudge never exceeds CARD_HEIGHT.
const NUMBER_LINE_HEIGHT = Math.round(NUMBER_FONT_SIZE * 1.05);
// numberCol centers this Text's outer box (marginTop + lineHeight) via
// justifyContent — the largest nudge that still keeps the whole box inside
// CARD_HEIGHT (no overflow either edge) is the leftover headroom itself.
const NUMBER_TOP_NUDGE = Math.max(0, CARD_HEIGHT - NUMBER_LINE_HEIGHT);
// Fixed (not min) width, sized to fit three bold digits at NUMBER_FONT_SIZE
// without needing to shrink the font. This is what keeps the divider at a
// constant x position regardless of digit count — a *minWidth* would let a
// wider count grow the column and shift the divider along with it.
const NUMBER_COL_WIDTH = Math.round(NUMBER_FONT_SIZE * 1.9);

function ReportCategoryCardComponent({ category, title, count, onPress }: Props) {
  const style = REPORT_CATEGORY_STYLES[category];
  const isEmpty = count === 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(category)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${count} sample${count === 1 ? '' : 's'}`}
    >
      <View style={styles.numberCol}>
        <Text
          style={[styles.number, { color: isEmpty ? '#9CA3AF' : style.color }]}
          numberOfLines={1}
        >
          {count}
        </Text>
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={3}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: CARD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    gap: 8,
    // Shadow/border stand in for the removed color heading — the card still
    // needs to read as a raised, tappable tile against the screen background.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.06)',
  },
  numberCol: {
    height: '100%',
    width: NUMBER_COL_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  number: {
    fontSize: NUMBER_FONT_SIZE,
    lineHeight: NUMBER_LINE_HEIGHT,
    fontWeight: '800',
    marginTop: NUMBER_TOP_NUDGE,
    // Android pads a text line with extra ascent/descent space by default,
    // which pushes a single large glyph off-center within its box.
    ...Platform.select({
      android: { includeFontPadding: false, textAlignVertical: 'center' as const },
    }),
  },
  textCol: {
    flex: 1,
    borderLeftWidth: 2,
    borderLeftColor: '#9CA3AF',
    paddingLeft: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    lineHeight: 22,
  },
});

export const ReportCategoryCard = React.memo(ReportCategoryCardComponent);
