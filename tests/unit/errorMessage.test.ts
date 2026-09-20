import { getErrorMessage } from '../../src/lib/errorMessage';

describe('getErrorMessage', () => {
  it('reads the message off an Error', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
  });

  // apiClient rejects with plain { code, message, status } objects, not Errors.
  it("returns the server's message from a plain API error object", () => {
    expect(
      getErrorMessage(
        { code: 'SPECIMEN_REJECTED', message: 'This specimen was rejected.', status: 409 },
        'x',
      ),
    ).toBe('This specimen was rejected.');
  });

  it.each([null, undefined, {}, { message: '' }, { message: 42 }, 'a string', 7])(
    'falls back for %p',
    (value) => {
      expect(getErrorMessage(value, 'fallback')).toBe('fallback');
    },
  );
});
