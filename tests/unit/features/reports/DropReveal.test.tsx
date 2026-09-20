import React from 'react';
import { Animated, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { DropReveal } from '../../../../src/components/DropReveal';

const renderReveal = (reduceMotion: boolean) =>
  render(
    <DropReveal index={2} playKey={0} reduceMotion={reduceMotion} accent="#2E7D7A">
      <Text>card content</Text>
    </DropReveal>,
  );

beforeEach(() => jest.clearAllMocks());

describe('DropReveal', () => {
  it('always renders its child', () => {
    renderReveal(false);
    expect(screen.getByText('card content')).toBeTruthy();
  });

  it('builds the drop → splash animation when motion is allowed', () => {
    renderReveal(false);
    expect(Animated.sequence).toHaveBeenCalled();
    expect(Animated.spring).toHaveBeenCalled();
  });

  it('skips the animation entirely under reduced motion', () => {
    renderReveal(true);
    expect(screen.getByText('card content')).toBeTruthy();
    expect(Animated.sequence).not.toHaveBeenCalled();
  });
});
