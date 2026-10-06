import { Animated } from 'react-native';

import { colors, radius } from '@src/theme';

import { DropReveal } from '@components/DropReveal';

import { QueueItemCard } from './QueueItemCard';
import { QUEUE_STATUS_STYLES } from '../constants';
import { getQueueStatus } from '../status';
import { ITEM_STRIDE, getWheelRange, rollAwayStyle } from '../scrollEffects';
import type { QueueItem } from '../types';

const ANIMATED_ROWS = 8;
const ROW_STAGGER_MS = 90;

export interface QueueListRowProps {
  item: QueueItem;
  index: number;
  scrollY: Animated.Value;
  rowsTop: number;
  pinBottom: number;
  playKey: number;
  reduceMotion: boolean;
  hasVariableRows: boolean;
  isLive: boolean;
  isSelected: boolean;
  onPress: (id: string) => void;
}

/**
 * @description Animates queue entries while keeping variable-height correction feedback readable.
 * @param props - Entry, selection and scroll geometry.
 */
export function QueueListRow({
  item,
  index,
  scrollY,
  rowsTop,
  pinBottom,
  playKey,
  reduceMotion,
  hasVariableRows,
  isLive,
  isSelected,
  onPress,
}: QueueListRowProps): React.JSX.Element {
  const status = getQueueStatus(item);
  const rollStyle =
    reduceMotion || hasVariableRows
      ? undefined
      : rollAwayStyle(scrollY, getWheelRange(rowsTop + index * ITEM_STRIDE, pinBottom));
  return (
    <Animated.View style={rollStyle}>
      <DropReveal
        index={index}
        playKey={playKey}
        reduceMotion={reduceMotion || index >= ANIMATED_ROWS}
        accent={status ? QUEUE_STATUS_STYLES[status].color : colors.teal}
        radius={radius.xxl}
        staggerMs={ROW_STAGGER_MS}
      >
        <QueueItemCard item={item} onPress={onPress} selected={isSelected} live={isLive} />
      </DropReveal>
    </Animated.View>
  );
}
