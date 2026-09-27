import { Animated } from 'react-native';

// Sizes of a Queue row. The card is at least ITEM_HEIGHT tall (see QueueItemCard) and rows
// are ITEM_GAP apart, so a row's position can be worked out from its index — which is what
// lets each row react to the scroll without measuring every one.
export const ITEM_HEIGHT = 78;
export const ITEM_GAP = 12;
export const ITEM_STRIDE = ITEM_HEIGHT + ITEM_GAP;

// How far above the pinned filters a row starts to roll away.
export const WHEEL_ZONE = 72;

export interface ScrollRange {
  start: number;
  end: number;
}

/**
 * @description The scroll positions between which a row rolls away under the pinned
 * filters, like a wheel turning it out of sight.
 *
 * A row's on-screen top is `rowTop - scrollY`. It starts rolling when that reaches
 * `pinBottom + zone` (still fully visible, just above the filters) and is completely
 * behind them once its bottom edge reaches `pinBottom`.
 *
 * @param rowTop - The row's top in scroll-content coordinates.
 * @param pinBottom - The bottom edge of the pinned filters, in the list's own coordinates.
 * @param rowHeight - Row height; defaults to ITEM_HEIGHT.
 * @param zone - How far above the pin a row starts rolling; defaults to WHEEL_ZONE.
 */
export function getWheelRange(
  rowTop: number,
  pinBottom: number,
  rowHeight: number = ITEM_HEIGHT,
  zone: number = WHEEL_ZONE,
): ScrollRange {
  return {
    start: rowTop - pinBottom - zone,
    end: rowTop + rowHeight - pinBottom,
  };
}

/**
 * @description Where the filters sit before any scrolling, in the list's own
 * coordinates: below the list's top padding and the block that scrolls away above them.
 * Scrolling this far is exactly when they reach the top and pin.
 * @param listPaddingTop - The list's top content padding.
 * @param topBlockHeight - Height of the block that scrolls away above the filters.
 * @param gap - Gap between that block and the filters.
 */
export function getStickyRest(listPaddingTop: number, topBlockHeight: number, gap: number): number {
  return listPaddingTop + topBlockHeight + gap;
}

// interpolate() needs a range that goes up; guard against a degenerate (or not yet
// measured) one.
function safeRange({ start, end }: ScrollRange): number[] {
  return [start, Math.max(end, start + 1)];
}

export interface RollAwayStyle {
  opacity: Animated.AnimatedInterpolation<number>;
  transform: (
    | { perspective: number }
    | { rotateX: Animated.AnimatedInterpolation<string> }
    | { scale: Animated.AnimatedInterpolation<number> }
  )[];
}

/**
 * @description The look of something rolling away over `range`: it tilts back like the
 * top of a wheel turning away, shrinks a little and fades. Driven by the scroll
 * position, so it follows the finger exactly and runs on the native thread.
 * @param scrollY - The list's scroll position.
 * @param range - The scroll range to animate over, from getWheelRange.
 */
export function rollAwayStyle(scrollY: Animated.Value, range: ScrollRange): RollAwayStyle {
  const inputRange = safeRange(range);
  return {
    opacity: scrollY.interpolate({ inputRange, outputRange: [1, 0.2], extrapolate: 'clamp' }),
    transform: [
      { perspective: 700 },
      {
        rotateX: scrollY.interpolate({
          inputRange,
          outputRange: ['0deg', '42deg'],
          extrapolate: 'clamp',
        }),
      },
      {
        scale: scrollY.interpolate({ inputRange, outputRange: [1, 0.88], extrapolate: 'clamp' }),
      },
    ],
  };
}
