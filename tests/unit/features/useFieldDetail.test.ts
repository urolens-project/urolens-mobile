// Path: urolens-mobile/tests/unit/features/useFieldDetail.test.ts
import { renderHook } from '@testing-library/react-native';

import { useFieldDetail } from '@features/field-capture/hooks/useFieldDetail';
import { database } from '@db/database';

jest.mock('@nozbe/watermelondb', () => ({
  Q: { where: jest.fn((field: string, value: unknown) => ({ field, value })) },
}));

jest.mock('@db/database', () => ({
  database: { get: jest.fn() },
}));

interface MockField {
  id: string;
  serverId: string | null;
  fieldNo: number;
  magnification: 'HPF' | 'LPF';
  status: string;
  aiFindings: Record<string, number>;
  imageWidth: number;
  imageHeight: number;
  smartDiagnosis: Record<string, unknown> | null;
  smartDiagnosisUnavailable: boolean;
  localImageUri: string | null;
}

function mockField(overrides: Partial<MockField> = {}): MockField {
  return {
    id: 'field-1',
    serverId: 'server-field-1',
    fieldNo: 4,
    magnification: 'HPF',
    status: 'ANALYZED',
    aiFindings: {},
    imageWidth: 1200,
    imageHeight: 900,
    smartDiagnosis: null,
    smartDiagnosisUnavailable: true,
    localImageUri: null,
    ...overrides,
  };
}

function setUp(field: MockField, detectionRows: { detectionsJson: string }[]): void {
  (database.get as jest.Mock).mockImplementation((table: string) => {
    if (table === 'result_fields') {
      return {
        findAndObserve: () => ({
          subscribe: (handlers: { next: (f: MockField) => void }) => {
            handlers.next(field);
            return { unsubscribe: jest.fn() };
          },
        }),
      };
    }
    if (table === 'field_detections') {
      return {
        query: () => ({
          observe: () => ({
            subscribe: (handlers: { next: (rows: { detectionsJson: string }[]) => void }) => {
              handlers.next(detectionRows);
              return { unsubscribe: jest.fn() };
            },
          }),
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

// A field synced from another phone (or before a reinstall) has a server id but
// never got a field_detections row or a local image file written on this device —
// it must never look like a field with no detections (mobile PR #55 review,
// 1.2/3.14).
describe('useFieldDetail — isAwaitingBoxes (1.2/3.14)', () => {
  it('is true for a server field with no detections row and no local image', () => {
    setUp(mockField({ serverId: 'server-field-1', localImageUri: null }), []);

    const { result } = renderHook(() => useFieldDetail('field-1', 3, 10));

    expect(result.current.field?.isAwaitingBoxes).toBe(true);
  });

  it('is false once a field_detections row exists, even with zero boxes in it', () => {
    setUp(mockField({ localImageUri: null }), [{ detectionsJson: '[]' }]);

    const { result } = renderHook(() => useFieldDetail('field-1', 3, 10));

    expect(result.current.field?.isAwaitingBoxes).toBe(false);
  });

  it('is false once the field has a local image, even with no detections row yet', () => {
    setUp(mockField({ localImageUri: 'file:///fields/field-1.jpg' }), []);

    const { result } = renderHook(() => useFieldDetail('field-1', 3, 10));

    expect(result.current.field?.isAwaitingBoxes).toBe(false);
  });

  it('is false for a field with no server id yet (PENDING_UPLOAD, queued offline)', () => {
    setUp(mockField({ serverId: null, status: 'PENDING_UPLOAD', localImageUri: null }), []);

    const { result } = renderHook(() => useFieldDetail('field-1', 3, 10));

    expect(result.current.field?.isAwaitingBoxes).toBe(false);
  });

  it('is false for an ordinary field captured on this device (image and boxes both present)', () => {
    setUp(mockField({ localImageUri: 'file:///fields/field-1.jpg' }), [
      { detectionsJson: '[{"id":"d1","x":1,"y":1,"w":2,"h":2}]' },
    ]);

    const { result } = renderHook(() => useFieldDetail('field-1', 3, 10));

    expect(result.current.field?.isAwaitingBoxes).toBe(false);
  });
});
