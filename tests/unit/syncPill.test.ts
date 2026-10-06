import { getSyncPill } from '../../src/features/queue/syncPill';
import type { SyncStatus } from '../../src/db/sync/syncManager';

const sync = (state: SyncStatus['state'], lastSuccessAt: number | null = null): SyncStatus => ({
  state,
  lastSuccessAt,
});

describe('getSyncPill', () => {
  it('connected and synced: "Online • Queue Synchronized"', () => {
    expect(getSyncPill({ isOnline: true, sync: sync('succeeded', 1), lastSyncAt: 1 })).toEqual({
      label: 'Online • Queue Synchronized',
      tone: 'ok',
    });
  });

  it('offline: "Offline • Showing cached data"', () => {
    expect(getSyncPill({ isOnline: false, sync: sync('idle'), lastSyncAt: 1 })).toEqual({
      label: 'Offline • Showing cached data',
      tone: 'caution',
    });
  });

  it('connected but the last sync failed: says so, instead of claiming it is synchronized', () => {
    expect(getSyncPill({ isOnline: true, sync: sync('failed', 1), lastSyncAt: 1 })).toEqual({
      label: 'Online • Sync failed, showing cached data',
      tone: 'error',
    });
  });

  it('connected but a sync has never run', () => {
    expect(getSyncPill({ isOnline: true, sync: sync('idle'), lastSyncAt: null })).toEqual({
      label: 'Online • Not yet synced',
      tone: 'caution',
    });
  });

  it('shows "Syncing…" during the very first sync, rather than flashing "Not yet synced"', () => {
    expect(getSyncPill({ isOnline: true, sync: sync('syncing'), lastSyncAt: null })).toEqual({
      label: 'Online • Syncing…',
      tone: 'ok',
    });
  });

  it('a sync in progress after an earlier success still counts as synchronized', () => {
    expect(getSyncPill({ isOnline: true, sync: sync('syncing', 1), lastSyncAt: 1 }).label).toBe(
      'Online • Queue Synchronized',
    );
  });

  it('a sync that succeeded this session counts, even if the saved last-sync time is not loaded yet', () => {
    expect(
      getSyncPill({ isOnline: true, sync: sync('succeeded', 123), lastSyncAt: null }).tone,
    ).toBe('ok');
  });

  it('a saved last-sync time from an earlier session counts as having synced', () => {
    expect(getSyncPill({ isOnline: true, sync: sync('idle'), lastSyncAt: 456 }).label).toBe(
      'Online • Queue Synchronized',
    );
  });

  it('offline wins over a failed sync (the failure is just the missing network)', () => {
    expect(getSyncPill({ isOnline: false, sync: sync('failed'), lastSyncAt: null }).label).toBe(
      'Offline • Showing cached data',
    );
  });

  describe('changes the server refused (UROLENS-220)', () => {
    const synced = { isOnline: true, sync: sync('succeeded', 1), lastSyncAt: 1 };

    it('says one change could not be sent, and where to look', () => {
      expect(getSyncPill({ ...synced, failedActionCount: 1 })).toEqual({
        label: "1 change couldn't be sent • See Profile",
        tone: 'error',
      });
    });

    it('counts several', () => {
      expect(getSyncPill({ ...synced, failedActionCount: 3 }).label).toBe(
        "3 changes couldn't be sent • See Profile",
      );
    });

    it('says nothing about it when there are none', () => {
      expect(getSyncPill({ ...synced, failedActionCount: 0 }).label).toBe(
        'Online • Queue Synchronized',
      );
    });

    it('shows it even before the first sync of this session finishes', () => {
      expect(
        getSyncPill({
          isOnline: true,
          sync: sync('syncing'),
          lastSyncAt: null,
          failedActionCount: 2,
        }).tone,
      ).toBe('error');
    });

    it('being offline is said first: nothing can be sent or checked right now', () => {
      expect(getSyncPill({ ...synced, isOnline: false, failedActionCount: 2 }).label).toBe(
        'Offline • Showing cached data',
      );
    });

    it('a failed sync is said first: the list itself may be stale', () => {
      expect(getSyncPill({ ...synced, sync: sync('failed', 1), failedActionCount: 2 }).label).toBe(
        'Online • Sync failed, showing cached data',
      );
    });
  });
});
