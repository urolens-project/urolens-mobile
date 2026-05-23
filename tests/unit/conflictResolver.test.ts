import {
  resolveConflict,
  applyResolution,
  ConflictStrategy,
} from '../../src/db/sync/conflictResolver';

describe('conflictResolver', () => {
  describe('resolveConflict', () => {
    // Rule 1: status field — always SERVER_WINS regardless of table
    it('returns SERVER_WINS for status column on specimens', () => {
      const result = resolveConflict({
        table: 'specimens',
        column: 'status',
        serverValue: 'ASSIGNED',
        clientValue: 'IN_QUEUE',
        localRecord: {},
      });
      expect(result).toBe('SERVER_WINS');
    });

    it('returns SERVER_WINS for status column on queue_assignments', () => {
      const result = resolveConflict({
        table: 'queue_assignments',
        column: 'status',
        serverValue: 'COMPLETED',
        clientValue: 'ACTIVE',
        localRecord: {},
      });
      expect(result).toBe('SERVER_WINS');
    });

    it('returns SERVER_WINS for status column on manual_overrides even when is_synced=false', () => {
      // Rule 1 (status) takes priority over Rule 2 (unsynced override)
      const result = resolveConflict({
        table: 'manual_overrides',
        column: 'status',
        serverValue: 'server_status',
        clientValue: 'client_status',
        localRecord: { is_synced: false },
      });
      expect(result).toBe('SERVER_WINS');
    });

    // Rule 2: unsynced manual override — CLIENT_WINS
    it('returns CLIENT_WINS for manual_overrides when is_synced=false', () => {
      const result = resolveConflict({
        table: 'manual_overrides',
        column: 'corrected_value',
        serverValue: '10',
        clientValue: '14',
        localRecord: { is_synced: false },
      });
      expect(result).toBe('CLIENT_WINS');
    });

    it('returns CLIENT_WINS for manual_overrides rationale field when is_synced=false', () => {
      const result = resolveConflict({
        table: 'manual_overrides',
        column: 'rationale',
        serverValue: 'server rationale',
        clientValue: 'medtech rationale',
        localRecord: { is_synced: false },
      });
      expect(result).toBe('CLIENT_WINS');
    });

    // Rule 2 negative: synced override — SERVER_WINS
    it('returns SERVER_WINS for manual_overrides when is_synced=true', () => {
      const result = resolveConflict({
        table: 'manual_overrides',
        column: 'corrected_value',
        serverValue: '10',
        clientValue: '14',
        localRecord: { is_synced: true },
      });
      expect(result).toBe('SERVER_WINS');
    });

    // Rule 4: default — any other table/column falls through to SERVER_WINS
    it('returns SERVER_WINS for non-status column on specimens', () => {
      const result = resolveConflict({
        table: 'specimens',
        column: 'patient_name',
        serverValue: 'Juan Dela Cruz',
        clientValue: 'J. Dela Cruz',
        localRecord: {},
      });
      expect(result).toBe('SERVER_WINS');
    });

    it('returns SERVER_WINS for non-status column on analysis_results', () => {
      const result = resolveConflict({
        table: 'analysis_results',
        column: 'image_id',
        serverValue: 'img-001',
        clientValue: 'img-old',
        localRecord: {},
      });
      expect(result).toBe('SERVER_WINS');
    });

    it('returns SERVER_WINS for manual_overrides non-status column when is_synced is missing', () => {
      const result = resolveConflict({
        table: 'manual_overrides',
        column: 'corrected_value',
        serverValue: '5',
        clientValue: '7',
        localRecord: {}, // is_synced absent — not strictly false
      });
      expect(result).toBe('SERVER_WINS');
    });
  });

  describe('applyResolution', () => {
    it('returns serverValue when strategy is SERVER_WINS', () => {
      expect(applyResolution('SERVER_WINS', 'server_val', 'client_val')).toBe('server_val');
    });

    it('returns clientValue when strategy is CLIENT_WINS', () => {
      expect(applyResolution('CLIENT_WINS', 'server_val', 'client_val')).toBe('client_val');
    });

    it('handles null server value with SERVER_WINS', () => {
      expect(applyResolution('SERVER_WINS', null, 'client_val')).toBeNull();
    });

    it('handles null client value with CLIENT_WINS', () => {
      expect(applyResolution('CLIENT_WINS', 'server_val', null)).toBeNull();
    });

    it('handles object values correctly', () => {
      const serverObj = { count: 5 };
      const clientObj = { count: 8 };
      expect(applyResolution('SERVER_WINS', serverObj, clientObj)).toBe(serverObj);
      expect(applyResolution('CLIENT_WINS', serverObj, clientObj)).toBe(clientObj);
    });
  });
});
