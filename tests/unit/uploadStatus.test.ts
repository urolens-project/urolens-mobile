/**
 * uploadStatus: the in-memory "which field is uploading right now" signal pushChanges
 * updates and the field list/thumbnail stack subscribe to, for a live "Uploading…" vs
 * "Waiting to upload…" distinction between otherwise-identical PENDING_UPLOAD fields.
 */
import {
  getCurrentlyUploadingFieldId,
  setCurrentlyUploadingFieldId,
  subscribeCurrentlyUploadingField,
} from '../../src/db/sync/uploadStatus';

afterEach(() => {
  setCurrentlyUploadingFieldId(null);
});

describe('uploadStatus', () => {
  it('is null until a field is marked uploading', () => {
    expect(getCurrentlyUploadingFieldId()).toBeNull();
  });

  it('reports the field just set as uploading', () => {
    setCurrentlyUploadingFieldId('local-field-1');
    expect(getCurrentlyUploadingFieldId()).toBe('local-field-1');
  });

  it('notifies subscribed listeners on every change', () => {
    const listener = jest.fn();
    subscribeCurrentlyUploadingField(listener);

    setCurrentlyUploadingFieldId('local-field-1');
    setCurrentlyUploadingFieldId(null);

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops notifying once unsubscribed', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeCurrentlyUploadingField(listener);
    unsubscribe();

    setCurrentlyUploadingFieldId('local-field-1');

    expect(listener).not.toHaveBeenCalled();
  });
});
