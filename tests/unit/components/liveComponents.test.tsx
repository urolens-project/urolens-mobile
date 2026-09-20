import React from 'react';
import { Text } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { PulseDot } from '../../../src/components/PulseDot';
import { AnimatedCount } from '../../../src/components/AnimatedCount';
import { RiseIn } from '../../../src/components/RiseIn';

describe('PulseDot', () => {
  const hostViews = (tree: ReturnType<typeof render>) =>
    tree.UNSAFE_root.findAll((n) => (n.type as unknown) === 'View');

  it('draws an extra pulsing ring only while live', () => {
    const live = hostViews(render(<PulseDot color="#10B981" live />)).length;
    const still = hostViews(render(<PulseDot color="#10B981" live={false} />)).length;
    expect(live).toBeGreaterThan(still);
  });

  it('is decorative: hidden from screen readers', () => {
    const tree = render(<PulseDot color="#10B981" />);
    const hidden = tree.UNSAFE_root.findAll(
      (n) => n.props.importantForAccessibility === 'no-hide-descendants',
    );
    expect(hidden.length).toBeGreaterThan(0);
  });
});

describe('AnimatedCount', () => {
  afterEach(() => jest.useRealTimers());

  it('shows its value straight away on first render', () => {
    const { getByText } = render(<AnimatedCount value={7} />);
    expect(getByText('7')).toBeTruthy();
  });

  it('counts up to a new value and ends exactly on it', () => {
    jest.useFakeTimers();
    const { getByText, rerender } = render(<AnimatedCount value={2} />);

    rerender(<AnimatedCount value={9} />);
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(getByText('9')).toBeTruthy();
  });

  it('counts down as well', () => {
    jest.useFakeTimers();
    const { getByText, rerender } = render(<AnimatedCount value={9} />);

    rerender(<AnimatedCount value={3} />);
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(getByText('3')).toBeTruthy();
  });

  it('jumps straight to the new value under reduced motion', () => {
    const { getByText, rerender } = render(<AnimatedCount value={2} reduceMotion />);
    rerender(<AnimatedCount value={9} reduceMotion />);
    expect(getByText('9')).toBeTruthy();
  });
});

describe('RiseIn', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <RiseIn>
        <Text>hello</Text>
      </RiseIn>,
    );
    expect(getByText('hello')).toBeTruthy();
  });

  it('renders its children under reduced motion too', () => {
    const { getByText } = render(
      <RiseIn reduceMotion>
        <Text>hello</Text>
      </RiseIn>,
    );
    expect(getByText('hello')).toBeTruthy();
  });
});
