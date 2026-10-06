import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { REPORT_PERIOD_OPTIONS } from '../constants/reportHistory.constant';
import type { ReportPeriod } from '../types';

interface ReportFiltersProps {
  searchQuery: string;
  period: ReportPeriod;
  visibleCount: number;
  totalCount: number;
  hasFilters: boolean;
  onChangeSearch: (query: string) => void;
  onChangePeriod: (period: ReportPeriod) => void;
  onReset: () => void;
}

/**
 * @description Lets MedTechs find older samples within a report category and
 * shows how many records match without changing the category's total count.
 * @param props - Current search/date filters, counts, and change callbacks.
 */
export function ReportFilters({
  searchQuery,
  period,
  visibleCount,
  totalCount,
  hasFilters,
  onChangeSearch,
  onChangePeriod,
  onReset,
}: ReportFiltersProps): React.JSX.Element {
  const countLabel = `${visibleCount} of ${totalCount} samples`;

  return (
    <View style={styles.container}>
      <View style={styles.search}>
        <Icon name="search-outline" color={colors.gray500} />
        <TextInput
          style={styles.input}
          value={searchQuery}
          onChangeText={onChangeSearch}
          placeholder="Sample ID, patient ID, or test type"
          placeholderTextColor={colors.gray500}
          accessibilityLabel="Search reports"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      <Text style={styles.caption}>Filter by received date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.periods}>
          {REPORT_PERIOD_OPTIONS.map((option): React.JSX.Element => {
            const isSelected = period === option.value;
            const handlePress = (): void => onChangePeriod(option.value);
            return (
              <Pressable
                key={option.value}
                style={[styles.period, isSelected && styles.periodSelected]}
                onPress={handlePress}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.periodText, isSelected && styles.periodTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.summary}>
        <Text style={styles.caption} accessibilityLiveRegion="polite">
          {countLabel}
        </Text>
        {hasFilters && (
          <Pressable onPress={onReset} accessibilityRole="button">
            <Text style={styles.reset}>Clear filters</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, marginBottom: spacing.lg },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray300,
  },
  input: { flex: 1, ...typography.bodyLg, color: colors.gray900, paddingVertical: spacing.sm },
  caption: { ...typography.caption, color: colors.gray500 },
  periods: { flexDirection: 'row', gap: spacing.sm },
  period: {
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
  },
  periodSelected: { backgroundColor: colors.teal },
  periodText: { ...typography.label, color: colors.gray700 },
  periodTextSelected: { color: colors.white },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reset: { ...typography.label, color: colors.teal, paddingVertical: spacing.xs },
});
