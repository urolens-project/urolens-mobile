import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { StickyFilters } from '../../../src/features/queue/components/StickyFilters';

const fakeScroll = () => {
  const calls: Record<string, unknown>[] = [];
  const scrollY = {
    interpolate: jest.fn((config: Record<string, unknown>) => {
      calls.push(config);
      return {};
    }),
  };
  return { scrollY: scrollY as never, calls };
};

describe('StickyFilters', () => {
  it('shows what it is given', () => {
    const { scrollY } = fakeScroll();
    const view = render(
      <StickyFilters scrollY={scrollY} restY={280} onHeight={jest.fn()}>
        <Text>filters</Text>
      </StickyFilters>,
    );
    expect(view.getByText('filters')).toBeTruthy();
  });

  it('follows the scroll up to its resting distance, then holds', () => {
    const { scrollY, calls } = fakeScroll();
    render(
      <StickyFilters scrollY={scrollY} restY={280} onHeight={jest.fn()}>
        <Text>filters</Text>
      </StickyFilters>,
    );

    const translate = calls.find((c) => Array.isArray(c.outputRange) && c.outputRange[0] === 280)!;
    expect(translate.inputRange).toEqual([0, 280]);
    expect(translate.outputRange).toEqual([280, 0]);
    // Holds once pinned; keeps following if the list is pulled down past the top.
    expect(translate.extrapolateRight).toBe('clamp');
    expect(translate.extrapolateLeft).toBe('extend');
  });

  it('fades a soft edge in only as it pins', () => {
    const { scrollY, calls } = fakeScroll();
    render(
      <StickyFilters scrollY={scrollY} restY={280} onHeight={jest.fn()}>
        <Text>filters</Text>
      </StickyFilters>,
    );
    const edge = calls.find((c) => Array.isArray(c.outputRange) && c.outputRange[0] === 0)!;
    expect(edge.inputRange).toEqual([266, 280]);
    expect(edge.outputRange).toEqual([0, 1]);
  });

  it('copes before its resting distance is known', () => {
    const { scrollY, calls } = fakeScroll();
    render(
      <StickyFilters scrollY={scrollY} restY={0} onHeight={jest.fn()}>
        <Text>filters</Text>
      </StickyFilters>,
    );
    for (const c of calls) {
      const input = c.inputRange as number[];
      expect(input[1]).toBeGreaterThan(input[0]);
    }
  });

  it('reports its height, so the list can leave room for it', () => {
    const { scrollY } = fakeScroll();
    const onHeight = jest.fn();
    const view = render(
      <StickyFilters scrollY={scrollY} restY={280} onHeight={onHeight}>
        <Text>filters</Text>
      </StickyFilters>,
    );
    const bar = view.UNSAFE_root.findAll((n) => typeof n.props.onLayout === 'function')[0];
    fireEvent(bar, 'layout', { nativeEvent: { layout: { height: 62 } } });
    expect(onHeight).toHaveBeenCalledWith(62);
  });
});
