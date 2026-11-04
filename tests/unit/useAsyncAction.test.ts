/**
 * useAsyncAction — what a failed action leaves in `error` / `getError()`.
 *
 * API errors reach the hook as plain `{ code, message }` objects (apiClient's
 * ApiError), not Error instances. The screens show `message` and branch on `code`
 * (FieldListScreen syncs on FIELDS_UNDECIDED), so both must survive; stringifying
 * the object used to show "[object Object]".
 */
import { act, renderHook } from '@testing-library/react-native';

import { useAsyncAction } from '../../src/hooks/useAsyncAction';

jest.spyOn(console, 'error').mockImplementation(() => {});

function renderFailingAction(thrown: unknown) {
  return renderHook(() =>
    useAsyncAction('Test', async (): Promise<void> => {
      throw thrown;
    }),
  );
}

describe('useAsyncAction errors', () => {
  it('keeps the message and code of a plain API error object', async () => {
    const { result } = renderFailingAction({
      code: 'FIELDS_UNDECIDED',
      message: '1 field not reviewed.',
      status: 409,
    });

    await act(async () => {
      await result.current.run();
    });

    const error = result.current.getError();
    expect(error?.message).toBe('1 field not reviewed.');
    expect(error?.code).toBe('FIELDS_UNDECIDED');
    expect(result.current.error?.message).toBe('1 field not reviewed.');
  });

  it('returns the error from getError() right after run() settles, before a re-render', async () => {
    const { result } = renderFailingAction({ code: 'X', message: 'boom' });
    const { run, getError } = result.current;

    let seen: string | undefined;
    await act(async () => {
      await run();
      seen = getError()?.message;
    });

    expect(seen).toBe('boom');
  });

  it('passes an Error instance through unchanged', async () => {
    const thrown = new Error('Network Error');
    const { result } = renderFailingAction(thrown);

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.getError()).toBe(thrown);
  });

  it('clears the error when the next run starts', async () => {
    let shouldFail = true;
    const { result } = renderHook(() =>
      useAsyncAction('Test', async (): Promise<string> => {
        if (shouldFail) throw { code: 'X', message: 'boom' };
        return 'ok';
      }),
    );

    await act(async () => {
      await result.current.run();
    });
    shouldFail = false;
    await act(async () => {
      await result.current.run();
    });

    expect(result.current.getError()).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
