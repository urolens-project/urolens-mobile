import {
  ITEM_HEIGHT,
  ITEM_STRIDE,
  WHEEL_ZONE,
  getStickyRest,
  getWheelRange,
  rollAwayStyle,
} from '../../src/features/queue/scrollEffects';

describe('getWheelRange', () => {
  it('starts rolling while the row is still fully visible above the pinned filters, and ends when it is behind them', () => {
    // A row 400px down the content, filters pinned to the top 60px.
    const { start, end } = getWheelRange(400, 60);

    // On-screen top = rowTop - scrollY. Rolling starts when that is (pinBottom + zone) …
    expect(400 - start).toBe(60 + WHEEL_ZONE);
    // … and it's fully behind the filters when its bottom edge reaches pinBottom.
    expect(400 + ITEM_HEIGHT - end).toBe(60);
  });

  it('a row further down starts rolling later', () => {
    const first = getWheelRange(400, 60);
    const second = getWheelRange(400 + ITEM_STRIDE, 60);
    expect(second.start - first.start).toBe(ITEM_STRIDE);
    expect(second.end - first.end).toBe(ITEM_STRIDE);
  });

  it('always covers a positive stretch of scrolling', () => {
    const { start, end } = getWheelRange(0, 0);
    expect(end).toBeGreaterThan(start);
  });

  it('does not begin before any scrolling for a row that starts well below the filters', () => {
    // Rows at rest start below the list header (~350px) with filters ~60px tall.
    expect(getWheelRange(350, 60).start).toBeGreaterThan(0);
  });
});

describe('getStickyRest', () => {
  it('is the list padding plus the block that scrolls away plus the gap under it', () => {
    expect(getStickyRest(16, 250, 14)).toBe(280);
  });
});

describe('rollAwayStyle', () => {
  const fakeScroll = () => {
    const calls: {
      inputRange: number[];
      outputRange: (number | string)[];
      extrapolate?: string;
    }[] = [];
    const scrollY = {
      interpolate: jest.fn((config) => {
        calls.push(config);
        return { config };
      }),
    };
    return { scrollY: scrollY as never, calls };
  };

  it('fades, tilts back like a wheel and shrinks, over the range', () => {
    const { scrollY, calls } = fakeScroll();
    const style = rollAwayStyle(scrollY, { start: 100, end: 300 });

    expect(calls).toHaveLength(3);
    expect(calls.every((c) => c.inputRange[0] === 100 && c.inputRange[1] === 300)).toBe(true);
    expect(calls.every((c) => c.extrapolate === 'clamp')).toBe(true);

    const byOutput = (first: number | string) => calls.find((c) => c.outputRange[0] === first)!;
    expect(byOutput(1).outputRange).toEqual([1, 0.2]); // opacity (scale is the other 1 → 0.88)
    expect(calls.map((c) => c.outputRange)).toEqual(
      expect.arrayContaining([
        ['0deg', '42deg'],
        [1, 0.88],
        [1, 0.2],
      ]),
    );

    // perspective is what makes the tilt read as a wheel
    expect(style.transform[0]).toEqual({ perspective: 700 });
    expect(Object.keys(style.transform[1])).toEqual(['rotateX']);
    expect(Object.keys(style.transform[2])).toEqual(['scale']);
  });

  it('survives a degenerate range (before the layout is measured)', () => {
    const { scrollY, calls } = fakeScroll();
    rollAwayStyle(scrollY, { start: 0, end: 0 });
    for (const c of calls) expect(c.inputRange[1]).toBeGreaterThan(c.inputRange[0]);
  });
});
