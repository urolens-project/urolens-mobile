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
  ],
});
