import React from 'react';
import { Animated } from 'react-native';
import { render } from '@testing-library/react-native';
import { HeaderWaves, QUEUE_WAVES } from '../../../src/components/HeaderWaves';
import { QueueHeader } from '../../../src/features/queue/components/QueueHeader';

const loop = Animated.loop as jest.Mock;

const headerProps = {
  username: 'maria.santos',
  activeCount: 6,
  dateLabel: 'Sep 20, 2026',
  topInset: 44,
  playKey: 0,
  reduceMotion: false,
  live: true,
  syncing: false,
  syncDisabled: false,
  onSync: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

// The compact Queue header loops its smaller waves while visible, plus its sync
// icon during a sync. All motion stops out of view or with reduced motion enabled.
describe('the waves', () => {
  const wave = (flow?: boolean) => (
    <HeaderWaves
      width={390}
      height={230}
      preset={QUEUE_WAVES}
      topInset={44}
      enter={new Animated.Value(1)}
      enterBack={new Animated.Value(1)}
      flow={flow}
    />
  );

  it('flow: both waves loop forever, without jumping back between rounds', () => {
    render(wave(true));

    // One endless loop per wave, and the loops don't reset the value between rounds.
    expect(loop).toHaveBeenCalledTimes(2);
    for (const [, config] of loop.mock.calls) {
      expect(config).toEqual({ resetBeforeIteration: false });
    }
  });

  it('holds still when flow is off (the default), as on Reports', () => {
    render(wave());
    expect(loop).not.toHaveBeenCalled();
    render(wave(false));
    expect(loop).not.toHaveBeenCalled();
  });
});

describe('the Queue header', () => {
  it('keeps the two compact waves moving while live', () => {
    render(<QueueHeader {...headerProps} />);
    expect(loop).toHaveBeenCalledTimes(2);
    for (const [, config] of loop.mock.calls) {
      expect(config).toEqual({ resetBeforeIteration: false });
    }
  });

  it('stops both waves and the sync animation when the tab leaves view', () => {
    const view = render(<QueueHeader {...headerProps} syncing />);
    // Wave cleanup stops its enclosing sequence; the Animated mock does not
    // forward that stop to the loop nested inside it.
    const waveAnimations = (Animated.sequence as jest.Mock).mock.results
      .map(({ value }) => value)
      .filter((animation) => animation.start.mock.calls.length > 0);
    const syncAnimation = loop.mock.results[loop.mock.results.length - 1].value;
    expect(waveAnimations).toHaveLength(2);
    view.rerender(<QueueHeader {...headerProps} syncing live={false} />);
    for (const animation of [...waveAnimations, syncAnimation]) {
      expect(animation.stop).toHaveBeenCalledTimes(1);
    }
    expect(loop).toHaveBeenCalledTimes(3);
  });

  it('keeps nothing running when the tab is out of view', () => {
    render(<QueueHeader {...headerProps} live={false} />);
    expect(loop).not.toHaveBeenCalled();
  });

  it('keeps nothing running under reduced motion', () => {
    render(<QueueHeader {...headerProps} reduceMotion />);
    expect(loop).not.toHaveBeenCalled();
  });

  it('turns the sync icon alongside the waves while syncing', () => {
    render(<QueueHeader {...headerProps} syncing />);
    expect(loop).toHaveBeenCalledTimes(3);
  });

  it('resumes the waves and sync animation when it comes back into view', () => {
    const view = render(<QueueHeader {...headerProps} syncing live={false} />);
    expect(loop).not.toHaveBeenCalled();
    view.rerender(<QueueHeader {...headerProps} syncing live />);
    expect(loop).toHaveBeenCalledTimes(3);
  });
});
