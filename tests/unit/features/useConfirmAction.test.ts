import { renderHook, act } from '@testing-library/react-native';
import { useConfirmAction } from '@features/result-confirmation/hooks/useConfirmAction';
import { confirmResultCore } from '@features/result-confirmation/lib/confirmResultCore';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import type AnalysisResult from '@db/models/AnalysisResult';

jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));
jest.mock('@features/result-confirmation/lib/confirmResultCore', () => ({
  confirmResultCore: jest.fn(),
}));

const result = { serverId: 'srv-1' } as unknown as AnalysisResult;

beforeEach(() => {
  jest.clearAllMocks();
  (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
});

describe('useConfirmAction', () => {
  it('resolves confirmed on success', async () => {
    (confirmResultCore as jest.Mock).mockResolvedValue(undefined);
    const { result: hook } = renderHook(() => useConfirmAction());

    let outcome;
    await act(async () => {
      outcome = await hook.current.confirmResult(result);
    });

    expect(outcome).toEqual({ status: 'confirmed' });
    expect(hook.current.error).toBeNull();
    expect(hook.current.isConfirming).toBe(false);
  });

  // Bug: callers read `error` after awaiting, which is the previous render's value —
  // so the alert always showed the fallback text. The message now comes back from the call.
  it("returns the server's message from a plain API error object, not a generic fallback", async () => {
    (confirmResultCore as jest.Mock).mockRejectedValue({
      code: 'SPECIMEN_REJECTED',
      message: "This specimen was rejected, so its result can't be confirmed.",
      status: 409,
    });
    const { result: hook } = renderHook(() => useConfirmAction());

    let outcome;
    await act(async () => {
      outcome = await hook.current.confirmResult(result);
    });

    expect(outcome).toEqual({
      status: 'failed',
      message: "This specimen was rejected, so its result can't be confirmed.",
    });
    expect(hook.current.error).toBe(
      "This specimen was rejected, so its result can't be confirmed.",
    );
    expect(hook.current.isConfirming).toBe(false);
  });

  it('reads the message off an Error too', async () => {
    (confirmResultCore as jest.Mock).mockRejectedValue(new Error('disk full'));
    const { result: hook } = renderHook(() => useConfirmAction());

    let outcome;
    await act(async () => {
      outcome = await hook.current.confirmResult(result);
    });

    expect(outcome).toEqual({ status: 'failed', message: 'disk full' });
  });

  it('falls back only when the failure carries no message at all', async () => {
    (confirmResultCore as jest.Mock).mockRejectedValue({});
    const { result: hook } = renderHook(() => useConfirmAction());

    let outcome;
    await act(async () => {
      outcome = await hook.current.confirmResult(result);
    });

    expect(outcome).toEqual({ status: 'failed', message: 'Failed to confirm result' });
  });

  // Bug: a double-tap hit the in-flight guard, returned false, and the screen alerted
  // "Confirmation Failed" although the first tap was still going through.
  it('reports busy — not a failure — for a second call while one is running', async () => {
    let finish: () => void = () => {};
    (confirmResultCore as jest.Mock).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const { result: hook } = renderHook(() => useConfirmAction());

    let first: Promise<unknown> = Promise.resolve();
    let second: unknown;
    await act(async () => {
      first = hook.current.confirmResult(result);
      second = await hook.current.confirmResult(result);
    });

    expect(second).toEqual({ status: 'busy' });
    expect(confirmResultCore).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish();
      await first;
    });
    expect(await first).toEqual({ status: 'confirmed' });
  });

  it('can confirm again after a failure', async () => {
    (confirmResultCore as jest.Mock)
      .mockRejectedValueOnce({ message: 'try again' })
      .mockResolvedValueOnce(undefined);
    const { result: hook } = renderHook(() => useConfirmAction());

    await act(async () => {
      await hook.current.confirmResult(result);
    });
    let outcome;
    await act(async () => {
      outcome = await hook.current.confirmResult(result);
    });

    expect(outcome).toEqual({ status: 'confirmed' });
    expect(hook.current.error).toBeNull();
  });
});
