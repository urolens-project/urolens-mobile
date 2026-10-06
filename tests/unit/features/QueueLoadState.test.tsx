import { fireEvent, render } from '@testing-library/react-native';

import { QueueLoadState } from '@features/queue/components/QueueLoadState';
import { QueuePagination } from '@features/queue/components/QueuePagination';

describe('queue load feedback', () => {
  const onRetry = jest.fn(async (): Promise<void> => {});

  it('says all caught up under a status filter when the entire queue is empty', (): void => {
    const view = render(
      <QueueLoadState
        isLoading={false}
        error={null}
        hasActiveSamples={false}
        isOnline
        filter="RETURNED"
        reduceMotion
        onRetry={onRetry}
      />,
    );
    expect(view.getByText('You’re all caught up')).toBeTruthy();
  });

  it('shows loading instead of an empty queue during the first read', (): void => {
    const view = render(
      <QueueLoadState
        isLoading
        error={null}
        isOnline
        filter="ALL"
        reduceMotion
        onRetry={onRetry}
      />,
    );
    expect(view.getByText('Loading your queue…')).toBeTruthy();
    expect(view.queryByText('You’re all caught up')).toBeNull();
  });

  it('shows an actionable error instead of claiming the queue is clear', (): void => {
    const view = render(
      <QueueLoadState
        isLoading={false}
        error={new Error('Internal error')}
        isOnline
        filter="ALL"
        reduceMotion
        onRetry={onRetry}
      />,
    );
    expect(view.getByText('Couldn’t load queue')).toBeTruthy();
    expect(view.queryByText('You’re all caught up')).toBeNull();
    expect(view.queryByText('Internal error')).toBeNull();
    fireEvent.press(view.getByLabelText('Retry loading queue'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('explains when saved work remains available after an error', (): void => {
    const view = render(
      <QueueLoadState
        isLoading={false}
        error={new Error('Network failure')}
        hasItems
        isOnline
        filter="ALL"
        reduceMotion
        onRetry={onRetry}
      />,
    );
    expect(view.getByText('Showing saved samples. Refresh to try again.')).toBeTruthy();
  });

  it('distinguishes a clear queue, an empty filter and missing offline data', (): void => {
    const view = render(
      <QueueLoadState
        isLoading={false}
        error={null}
        isOnline
        filter="ALL"
        reduceMotion
        onRetry={onRetry}
      />,
    );
    expect(view.getByText('You’re all caught up')).toBeTruthy();
    view.rerender(
      <QueueLoadState
        isLoading={false}
        error={null}
        isOnline
        filter="RETURNED"
        reduceMotion
        onRetry={onRetry}
      />,
    );
    expect(view.getByText('No matches')).toBeTruthy();
    view.rerender(
      <QueueLoadState
        isLoading={false}
        error={null}
        isOnline={false}
        filter="ALL"
        reduceMotion
        onRetry={onRetry}
      />,
    );
    expect(view.getByText("You're offline")).toBeTruthy();
    expect(view.queryByText('You’re all caught up')).toBeNull();
  });
});

describe('queue pagination controls', () => {
  it('shows the filtered range and disables navigation at each boundary', (): void => {
    const onNext = jest.fn();
    const onPrevious = jest.fn();
    const view = render(
      <QueuePagination
        page={1}
        pageCount={3}
        totalItems={45}
        onNext={onNext}
        onPrevious={onPrevious}
      />,
    );
    expect(view.getByText('Showing 1–20 of 45')).toBeTruthy();
    expect(view.getByLabelText('Previous queue page').props.disabled).toBe(true);
    fireEvent.press(view.getByLabelText('Next queue page'));
    expect(onNext).toHaveBeenCalledTimes(1);
    view.rerender(
      <QueuePagination
        page={3}
        pageCount={3}
        totalItems={45}
        onNext={onNext}
        onPrevious={onPrevious}
      />,
    );
    expect(view.getByText('Showing 41–45 of 45')).toBeTruthy();
    expect(view.getByLabelText('Next queue page').props.disabled).toBe(true);
    fireEvent.press(view.getByLabelText('Previous queue page'));
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });
});
