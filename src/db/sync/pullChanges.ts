import { database } from '../database';
import apiClient from '@lib/apiClient';
import { resolveConflict, applyResolution } from './conflictResolver';

interface ServerRecord {
  id: string;
  [key: string]: unknown;
}

interface SyncChanges {
  changes: {
    specimens?:        { created: ServerRecord[]; updated: ServerRecord[] };
    queue_assignments?: { created: ServerRecord[]; updated: ServerRecord[] };
    analysis_results?:  { created: ServerRecord[]; updated: ServerRecord[] };
  };
  timestamp: string;
}

export async function pullChanges(lastSyncedAt: string | null): Promise<string> {
  const params = lastSyncedAt ? `?last_synced_at=${encodeURIComponent(lastSyncedAt)}` : '';
  const response = await apiClient.get<SyncChanges>(`/sync/pull${params}`);
  const { changes, timestamp } = response.data;

  await database.write(async () => {
    if (changes.specimens) {
      await processCreates('specimens', changes.specimens.created);
      await processUpdates('specimens', changes.specimens.updated);
    }
    if (changes.queue_assignments) {
      await processCreates('queue_assignments', changes.queue_assignments.created);
      await processUpdates('queue_assignments', changes.queue_assignments.updated);
    }
    if (changes.analysis_results) {
      await processCreates('analysis_results', changes.analysis_results.created);
      await processUpdates('analysis_results', changes.analysis_results.updated);
    }
  });

  return timestamp;
}

async function processCreates(tableName: string, records: ServerRecord[]): Promise<void> {
  if (!records.length) return;
  const collection = database.get(tableName);
  for (const record of records) {
    await collection.create((model) => {
      Object.assign(model as unknown as Record<string, unknown>, mapServerToLocal(tableName, record));
    });
  }
}

async function processUpdates(tableName: string, records: ServerRecord[]): Promise<void> {
  if (!records.length) return;
  const collection = database.get(tableName);
  for (const serverRecord of records) {
    try {
      const allLocalRecords = await collection.query().fetch() as unknown as Record<string, unknown>[];
      const localRecord = allLocalRecords.find((r) => r['serverId'] === serverRecord.id);

      // Record not in local DB yet — delta sync sent it as an update but it's new here
      if (!localRecord) {
        await collection.create((model) => {
          Object.assign(
            model as unknown as Record<string, unknown>,
            mapServerToLocal(tableName, serverRecord),
          );
        });
        continue;
      }

      await (localRecord as { update: (fn: (r: Record<string, unknown>) => void) => Promise<void> })
        .update((r) => {
          const mapped = mapServerToLocal(tableName, serverRecord);
          for (const [key, serverVal] of Object.entries(mapped)) {
            const clientVal = r[key];
            if (serverVal !== clientVal) {
              const strategy = resolveConflict({
                table: tableName,
                column: key,
                serverValue: serverVal,
                clientValue: clientVal,
                localRecord: localRecord as Record<string, unknown>,
              });
              r[key] = applyResolution(strategy, serverVal, clientVal);
            } else {
              r[key] = serverVal;
            }
          }
        });
    } catch (err) {
      console.error(`[pullChanges] Failed to update ${tableName} record ${serverRecord.id}:`, err);
    }
  }
}

function mapServerToLocal(table: string, record: ServerRecord): Record<string, unknown> {
  const base: Record<string, unknown> = {
    serverId: record.id,
    syncedAt: new Date().toISOString(),
  };

  switch (table) {
    case 'specimens':
      return {
        ...base,
        sampleUid:       record['sample_uid'],
        patientName:     record['patient_name'],
        patientUid:      record['patient_uid'],
        testType:        record['test_type'],
        status:          record['status'],
        priorityLevel:   record['priority_level'] ?? null,
        receivedAt:      record['received_at'],
        assignedAt:      record['assigned_at'] ?? null,
        medtechId:       record['medtech_id'] ?? null,
        rejectionReason: record['rejection_reason'] ?? null,
        rejectionNote:   record['rejection_note'] ?? null,
        rejectedAt:      record['rejected_at'] ?? null,
      };

    case 'queue_assignments':
      return {
        ...base,
        specimenId: record['specimen_id'],
        medtechId:  record['medtech_id'],
        assignedAt: record['assigned_at'],
        status:     record['status'],
      };

    case 'analysis_results':
      return {
        ...base,
        specimenId:          record['specimen_id'],
        aiFindingsJson:      JSON.stringify(record['ai_findings'] ?? {}),
        flaggedAnomaliesJson: JSON.stringify(record['flagged_anomalies'] ?? {}),
        smartDiagnosisJson:  record['smart_diagnosis']
          ? JSON.stringify(record['smart_diagnosis'])
          : null,
        status:  record['status'],
        imageId: record['image_id'] ?? null,
      };

    default:
      return base;
  }
}
