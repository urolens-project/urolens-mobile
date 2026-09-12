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
// A tight lineHeight leaves a digit's glyph sitting slightly above true
// center (fonts reserve more descender space than a numeral needs) — nudge
// it down instead of trusting flexbox centering alone.
const NUMBER_TOP_NUDGE = Math.round(NUMBER_FONT_SIZE * 0.16);
// Fixed (not min) width, sized to fit two bold digits at NUMBER_FONT_SIZE
// comfortably. This is what keeps the divider at a constant x position
// regardless of whether the count is 1 or 2 digits — a *minWidth* would let
// a wider two-digit count grow the column and shift the divider along with
// it; adjustsFontSizeToFit below is the safety valve for 3+ digit counts.
const NUMBER_COL_WIDTH = Math.round(NUMBER_FONT_SIZE * 1.3);

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
          adjustsFontSizeToFit
          minimumFontScale={0.5}
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
    lineHeight: NUMBER_FONT_SIZE,
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
