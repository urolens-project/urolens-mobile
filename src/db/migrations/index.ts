import {
  schemaMigrations,
  addColumns,
  unsafeExecuteSql,
} from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'specimens',
          columns: [
            { name: 'rejection_reason', type: 'string', isOptional: true },
            { name: 'rejection_note', type: 'string', isOptional: true },
            { name: 'rejected_at', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        // ── analysis_results: add fields required by epic-mob-06 ──────────────
        addColumns({
          table: 'analysis_results',
          columns: [
            { name: 'smart_diagnosis_unavailable', type: 'boolean' },
            { name: 'confirmed_at', type: 'string', isOptional: true },
            { name: 'confirmed_by', type: 'string', isOptional: true },
            { name: 'is_synced', type: 'boolean' },
            { name: 'created_at', type: 'number' },
          ],
        }),

        // ── manual_overrides: add new columns (parameter replaces parameter_name,
        //    numeric types replace string columns) ─────────────────────────────
        addColumns({
          table: 'manual_overrides',
          columns: [
            { name: 'parameter', type: 'string' },
            { name: 'overridden_by', type: 'string' },
            { name: 'created_at', type: 'number' },
          ],
        }),

        // Backfill parameter from parameter_name and coerce numeric string columns.
        // CAST(... AS REAL) converts stored strings to numbers for existing rows.
        unsafeExecuteSql(
          `UPDATE manual_overrides
           SET parameter         = COALESCE(parameter_name, ''),
               original_ai_value = CAST(original_ai_value AS REAL),
               corrected_value   = CAST(corrected_value   AS REAL)
           WHERE parameter IS NULL OR parameter = '';`,
        ),
      ],
    },
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 'analysis_results',
          columns: [{ name: 'return_reason', type: 'string', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        // ── specimens/analysis_results: fields needed to map and sort Reports
        //    by their actual approve/release dates instead of confirmedAt ────
        addColumns({
          table: 'specimens',
          columns: [{ name: 'completed_at', type: 'string', isOptional: true }],
        }),
        addColumns({
          table: 'analysis_results',
          columns: [
            { name: 'approved_at', type: 'string', isOptional: true },
            { name: 'released_at', type: 'string', isOptional: true },
            { name: 'particle_classes_json', type: 'string', isOptional: true },
          ],
        }),

        // One-time purge (UROLENS-235): before this version, pullChanges never
        // processed the server's deleted list, so a finished sample that aged
        // out of the 30-day history window could linger on the phone
        // indefinitely. Drop anything already past that window, plus the
        // rows that reference it — new installs never accumulate this, and
        // going forward pullChanges removes aged-out rows as they happen.
        unsafeExecuteSql(`
          DELETE FROM specimens
          WHERE status IN ('COMPLETED', 'REJECTED')
            AND COALESCE(completed_at, rejected_at, received_at) < datetime('now', '-30 days');
        `),
        unsafeExecuteSql(`
          DELETE FROM queue_assignments
          WHERE specimen_id NOT IN (SELECT server_id FROM specimens WHERE server_id IS NOT NULL);
        `),
        unsafeExecuteSql(`
          DELETE FROM analysis_results
          WHERE specimen_id NOT IN (SELECT server_id FROM specimens WHERE server_id IS NOT NULL);
        `),
        unsafeExecuteSql(`
          DELETE FROM manual_overrides
          WHERE result_id NOT IN (SELECT server_id FROM analysis_results WHERE server_id IS NOT NULL);
        `),
      ],
    },
    {
      toVersion: 6,
      steps: [
        // The server always sends patient_name as "" now (RA 10173 data minimization —
        // the app shows only the patient code) — see sync_service.py's pull(). Nothing
        // reads this column locally; drop it rather than keep storing an always-empty field.
        //
        // Can't use `ALTER TABLE ... DROP COLUMN` here — that syntax needs SQLite
        // 3.35+, and Android's bundled SQLite on many devices is older, so it fails
        // with "near DROP: syntax error" and WatermelonDB refuses to open the DB.
        // Rebuild the table instead (rename → recreate → copy → drop), the
        // long-standing SQLite-safe way to drop a column.
        unsafeExecuteSql('ALTER TABLE specimens RENAME TO _specimens_old;'),
        unsafeExecuteSql(
          `CREATE TABLE specimens ("id" primary key, "_changed", "_status",
            "server_id", "sample_uid", "patient_uid", "test_type", "status",
            "priority_level", "received_at", "assigned_at", "completed_at",
            "medtech_id", "rejection_reason", "rejection_note", "rejected_at",
            "synced_at");`,
        ),
        unsafeExecuteSql(
          `INSERT INTO specimens ("id", "_changed", "_status", "server_id",
            "sample_uid", "patient_uid", "test_type", "status", "priority_level",
            "received_at", "assigned_at", "completed_at", "medtech_id",
            "rejection_reason", "rejection_note", "rejected_at", "synced_at")
          SELECT "id", "_changed", "_status", "server_id", "sample_uid",
            "patient_uid", "test_type", "status", "priority_level", "received_at",
            "assigned_at", "completed_at", "medtech_id", "rejection_reason",
            "rejection_note", "rejected_at", "synced_at"
          FROM _specimens_old;`,
        ),
        unsafeExecuteSql('DROP TABLE _specimens_old;'),
        unsafeExecuteSql(
          'create index if not exists "specimens__status" on "specimens" ("_status");',
        ),
      ],
    },
    {
      toVersion: 7,
      steps: [
        // Multi-image capture sessions (10-30 fields of view per specimen) — see
        // POST /images/upload-batch. image_id keeps pointing at the representative
        // image; this column holds the full set for retake/discard.
        addColumns({
          table: 'analysis_results',
          columns: [{ name: 'image_ids_json', type: 'string', isOptional: true }],
        }),
      ],
    },
  ],
});
