/**
 * Conflict resolution rules (Mobile Developer Guide §9.3):
 *   Rule 1 — status fields on any table: server value wins.
 *   Rule 2 — manual_overrides with is_synced=false: client value wins (in-progress draft).
 *   Rule 3 — record deleted on server, modified locally: server wins (apply deletion).
 *   Rule 4 — any other field conflict: server wins; log the discarded client value.
 */

export type ConflictStrategy = 'SERVER_WINS' | 'CLIENT_WINS';

export interface ConflictContext {
  table: string;
  column: string;
  serverValue: unknown;
  clientValue: unknown;
  localRecord: Record<string, unknown>;
}

export function resolveConflict(ctx: ConflictContext): ConflictStrategy {
  // Rule 1: status is always authoritative on the server
  if (ctx.column === 'status') {
    return 'SERVER_WINS';
  }

  // Rule 2: unsynced MedTech override draft — preserve the local correction
  if (ctx.table === 'manual_overrides' && ctx.localRecord['is_synced'] === false) {
    return 'CLIENT_WINS';
  }

  // Rule 3 & 4: default — server wins; log the discarded client value
  console.warn(
    `[ConflictResolver] SERVER_WINS: ${ctx.table}.${ctx.column}. ` +
    `Discarded client value: ${JSON.stringify(ctx.clientValue)} at ${new Date().toISOString()}`,
  );
  return 'SERVER_WINS';
}

export function applyResolution(
  strategy: ConflictStrategy,
  serverValue: unknown,
  clientValue: unknown,
): unknown {
  return strategy === 'CLIENT_WINS' ? clientValue : serverValue;
}
