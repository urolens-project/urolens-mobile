import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { QueueDateSubFilters } from './QueueDateSubFilters';
import { QueueFilterMainChips } from './QueueFilterMainChips';
import { QueueStatusSubFilters } from './QueueStatusSubFilters';
import type { FilterOption } from '../types';

export interface QueueFilterBarProps {
  selected: FilterOption;
  onChange: (filter: FilterOption) => void;
  counts?: Partial<Record<FilterOption, number>>;
}

type ExpandedGroup = 'date' | 'status' | null;

/**
 * @description Filter chips for the Queue: All, plus expandable Date and Status groups
 * whose sub-chips pick the concrete filter.
 * @param selected - The currently active filter.
 * @param onChange - Called with the newly selected filter.
 * @param counts - Optional per-filter counts shown as small badges.
 */
export function QueueFilterBar({ selected, onChange, counts }: QueueFilterBarProps): React.JSX.Element {
  const isDateFilter = selected === 'LATEST' || selected === 'EARLIEST';
  const isStatusFilter =
    selected === 'ASSIGNED' || selected === 'PROCESSING' || selected === 'RETURNED';

  const [expandedGroup, setExpandedGroup] = useState<ExpandedGroup>(
    isDateFilter ? 'date' : isStatusFilter ? 'status' : null,
  );

  const handleMainChip = useCallback(
    (group: 'date' | 'all' | 'status'): void => {
      if (group === 'all') {
        onChange('ALL');
        setExpandedGroup(null);
        return;
      }
      if (group === 'date') {
        onChange('DATE');
        setExpandedGroup((prev) => (prev === 'date' ? null : 'date'));
        return;
      }
      onChange('STATUS');
      setExpandedGroup((prev) => (prev === 'status' ? null : 'status'));
    },
    [onChange],
  );

  const isDateActive = selected === 'DATE' || isDateFilter || expandedGroup === 'date';
  const isStatusActive = selected === 'STATUS' || isStatusFilter || expandedGroup === 'status';

  return (
    <View style={styles.wrapper}>
      <QueueFilterMainChips
        selected={selected}
        counts={counts}
        isDateActive={isDateActive}
        isStatusActive={isStatusActive}
        expandedGroup={expandedGroup}
        onMainChip={handleMainChip}
      />

      {expandedGroup === 'date' && <QueueDateSubFilters selected={selected} onChange={onChange} />}

      {expandedGroup === 'status' && (
        <QueueStatusSubFilters selected={selected} counts={counts} onChange={onChange} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 0,
  },
});
