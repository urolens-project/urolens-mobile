import { database } from '@db/database';
import type ManualOverride from '@db/models/ManualOverride';
import type PendingSync from '@db/models/PendingSync';
import { PendingSyncAction, PendingSyncStatus } from '@app-types/enums';

import type { ManualOverrideRecord, OverridePayload } from '../types';

/**
 * @description Commits the local correction and its offline outbox entry together, so an unsent edit cannot appear saved.
 * @param record - Attributed correction to display in the result.
 * @param pendingPayload - Present only when the override still needs to reach the server.
 */
export async function persistOverride(
  record: ManualOverrideRecord,
  pendingPayload?: OverridePayload,
): Promise<void> {
  await database.write(async (): Promise<void> => {
    const override = database.get<ManualOverride>('manual_overrides').prepareCreate((row): void => {
      row.serverId = record.serverId;
      row.resultId = record.resultId;
      row.parameter = record.parameter;
      row.originalAiValue = record.originalAiValue;
      row.correctedValue = record.correctedValue;
      row.rationale = record.rationale;
      row.overriddenBy = record.overriddenBy;
      row.isSynced = record.isSynced;
      row.createdAt = record.createdAt;
    });
    const pending = pendingPayload
      ? database.get<PendingSync>('pending_sync').prepareCreate((row): void => {
          row.entity = 'manual_override';
          row.entityId = record.resultId;
          row.action = PendingSyncAction.OVERRIDE_PARAMETER;
          row.payloadJson = JSON.stringify(pendingPayload);
          row.status = PendingSyncStatus.PENDING;
          row.createdAt = record.createdAt;
        })
      : null;
    await database.batch(override, pending);
  });
}
