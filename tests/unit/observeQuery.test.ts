/**
 * Unit tests for observeQuery — the retry wrapper around WatermelonDB's
 * query.observe().subscribe(), added after a real crash:
 *
 *   [Error: Cannot call database.adapter.underlyingAdapter while the
 *   database is being reset]
 *
 * That error fires if a query (re-)subscribes at the exact moment
 * syncManager's one-time database.unsafeResetDatabase() (first sync ever)
 * is mid-flight. observeQuery retries once that specific error is seen;
 * any other error is just logged, not retried.
 */

import { observeQuery } from '../../src/db/observeQuery';

interface FakeQuery {
  observe: jest.Mock;
}

function makeFakeQuery() {
  let capturedNext: ((rows: unknown[]) => void) | null = null;
  let capturedError: ((err: unknown) => void) | null = null;
  const unsubscribe = jest.fn();
  const subscribe = jest.fn((next: (rows: unknown[]) => void, error: (err: unknown) => void) => {
    capturedNext = next;
    capturedError = error;
    return { unsubscribe };
  });
  const observe = jest.fn(() => ({ subscribe }));

  return {
    query: { observe } as unknown as FakeQuery,
    emit: (rows: unknown[]) => capturedNext?.(rows),
    triggerError: (err: unknown) => capturedError?.(err),
    unsubscribe,
    observe,
    subscribe,
  };
}

describe('observeQuery', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  it('subscribes immediately and forwards emissions to onData', () => {
    const fake = makeFakeQuery();
    const onData = jest.fn();

    observeQuery(fake.query as any, onData);
    fake.emit([{ id: '1' }]);

    expect(fake.observe).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith([{ id: '1' }]);
  });

  it('retries once after the specific "database is being reset" error', () => {
    const fake = makeFakeQuery();
    const onData = jest.fn();

    observeQuery(fake.query as any, onData);
    expect(fake.observe).toHaveBeenCalledTimes(1);

    fake.triggerError(
      new Error('Cannot call database.adapter.underlyingAdapter while the database is being reset'),
    );

    // Not retried yet — still waiting out the backoff
    expect(fake.observe).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    jest.runAllTimers();

    expect(fake.observe).toHaveBeenCalledTimes(2);
  });

  it('delivers data normally once the retried subscription is established', () => {
    const fake = makeFakeQuery();
    const onData = jest.fn();

    observeQuery(fake.query as any, onData);
    fake.triggerError(new Error('... being reset'));
    jest.runAllTimers();

    fake.emit([{ id: 'after-retry' }]);
    expect(onData).toHaveBeenCalledWith([{ id: 'after-retry' }]);
  });

  it('logs (does not retry) a genuinely different error', () => {
    const fake = makeFakeQuery();
    const onData = jest.fn();

    observeQuery(fake.query as any, onData);
    fake.triggerError(new Error('Some unrelated failure'));

    jest.runAllTimers();

    expect(fake.observe).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[observeQuery] subscription error:',
      expect.any(Error),
    );
  });

  it('unsubscribing cancels a pending retry — no further observe() calls', () => {
    const fake = makeFakeQuery();
    const onData = jest.fn();

    const subscription = observeQuery(fake.query as any, onData);
    fake.triggerError(new Error('... being reset'));
    subscription.unsubscribe();

    jest.runAllTimers();

    expect(fake.observe).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe() tears down the current inner subscription', () => {
    const fake = makeFakeQuery();
    const subscription = observeQuery(fake.query as any, jest.fn());

    subscription.unsubscribe();

    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
