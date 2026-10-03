/**
 * Unit tests for uploadImageViaXhr's failure messages (UROLENS-220).
 *
 * Covers:
 *  - The server's own message is shown when the refusal carries one
 *  - A 413 with no message (e.g. answered by a proxy) explains the 10 MB limit
 *  - Any other bare status keeps the generic "Upload failed with status N"
 *  - A 2xx with a JSON body resolves with that body
 */

jest.mock('@lib/apiClient', () => ({
  __esModule: true,
  default: { defaults: { baseURL: 'https://api.test/api/v1/' } },
}));

jest.mock('@lib/auth/tokenStorage', () => ({
  tokenStorage: { getToken: jest.fn().mockResolvedValue('token-123') },
}));

jest.mock('@db/models/AnalysisResult', () => ({}));

import { uploadImageViaXhr } from '../../src/lib/camera/uploadImage';

interface FakeResponse {
  status: number;
  responseText: string;
}

// Minimal XMLHttpRequest: answers `send` with the configured response.
function installFakeXhr(response: FakeResponse): { opened: string[] } {
  const opened: string[] = [];
  class FakeXhr {
    status = 0;
    responseText = '';
    timeout = 0;
    upload: { onprogress: unknown } = { onprogress: null };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    ontimeout: (() => void) | null = null;
    onabort: (() => void) | null = null;
    open(method: string, url: string): void {
      opened.push(`${method} ${url}`);
    }
    setRequestHeader(): void {}
    abort(): void {}
    send(): void {
      this.status = response.status;
      this.responseText = response.responseText;
      this.onload?.();
    }
  }
  (global as Record<string, unknown>).XMLHttpRequest = FakeXhr;
  return { opened };
}

function upload(): Promise<unknown> {
  return uploadImageViaXhr(new FormData(), new AbortController().signal, jest.fn());
}

const originalXhr = (global as Record<string, unknown>).XMLHttpRequest;

afterEach(() => {
  (global as Record<string, unknown>).XMLHttpRequest = originalXhr;
});

describe('uploadImageViaXhr failure messages', () => {
  it("shows the server's message when the refusal has one", async () => {
    installFakeXhr({
      status: 413,
      responseText: JSON.stringify({
        error: { code: 'IMAGE_TOO_LARGE', message: 'Image exceeds the 10 MB limit.' },
      }),
    });

    await expect(upload()).rejects.toThrow('Image exceeds the 10 MB limit.');
  });

  it('explains the limit when a 413 carries no message', async () => {
    installFakeXhr({ status: 413, responseText: '<html>Request Entity Too Large</html>' });

    await expect(upload()).rejects.toThrow(
      'This image is too large to upload (the limit is 10 MB). Please retake the photo.',
    );
  });

  it('keeps the generic message for any other bare status', async () => {
    installFakeXhr({ status: 502, responseText: 'Bad Gateway' });

    await expect(upload()).rejects.toThrow('Upload failed with status 502');
  });

  it('resolves with the body on success', async () => {
    const { opened } = installFakeXhr({
      status: 201,
      responseText: JSON.stringify({ id: 'r1', resultId: 'r1' }),
    });

    await expect(upload()).resolves.toMatchObject({ resultId: 'r1' });
    expect(opened).toEqual(['POST https://api.test/api/v1/images/upload']);
  });
});
