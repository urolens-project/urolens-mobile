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

// "Infinite": every moving part is an Animated.loop, so these check that each one is
// started while the header is live, and that none of them is left running when it is not.
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
  it('sets a whole field of circles moving, plus the waves, while live', () => {
    render(<QueueHeader {...headerProps} />);
    // 5 drifting circles × 2 axes + 6 rising bubbles + 2 waves = 18 endless loops.
    expect(loop.mock.calls.length).toBe(18);
  });

  it('every drifting circle and wave loops without resetting, so there is no visible jump', () => {
    render(<QueueHeader {...headerProps} />);
    const noReset = loop.mock.calls.filter(([, config]) => config?.resetBeforeIteration === false);
    expect(noReset.length).toBe(loop.mock.calls.length);
  });

  it('keeps nothing running when the tab is out of view', () => {
    render(<QueueHeader {...headerProps} live={false} />);
    expect(loop).not.toHaveBeenCalled();
  });

  it('keeps nothing running under reduced motion', () => {
    render(<QueueHeader {...headerProps} reduceMotion />);
    expect(loop).not.toHaveBeenCalled();
  });

  it('turns the sync icon while syncing, in addition', () => {
    render(<QueueHeader {...headerProps} syncing />);
    expect(loop.mock.calls.length).toBe(19);
  });

  it('starts again when it comes back into view', () => {
    const view = render(<QueueHeader {...headerProps} live={false} />);
    expect(loop).not.toHaveBeenCalled();
    view.rerender(<QueueHeader {...headerProps} live />);
    expect(loop.mock.calls.length).toBe(18);
  });
});
