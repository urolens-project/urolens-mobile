import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
          style={[styles.number, { color: isEmpty ? '#D1D5DB' : style.color }]}
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
    gap: 14,
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
    minWidth: CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  number: {
    fontSize: NUMBER_FONT_SIZE,
    lineHeight: NUMBER_FONT_SIZE,
    fontWeight: '800',
  },
  textCol: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#F3F4F6',
    paddingLeft: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    lineHeight: 20,
  },
});

export const ReportCategoryCard = React.memo(ReportCategoryCardComponent);
