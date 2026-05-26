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
            { name: 'rejection_note',   type: 'string', isOptional: true },
            { name: 'rejected_at',      type: 'string', isOptional: true },
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
            { name: 'confirmed_at',                type: 'string', isOptional: true },
            { name: 'confirmed_by',                type: 'string', isOptional: true },
            { name: 'is_synced',                   type: 'boolean' },
            { name: 'created_at',                  type: 'number' },
          ],
        }),

        // ── manual_overrides: add new columns (parameter replaces parameter_name,
        //    numeric types replace string columns) ─────────────────────────────
        addColumns({
          table: 'manual_overrides',
          columns: [
            { name: 'parameter',     type: 'string' },
            { name: 'overridden_by', type: 'string' },
            { name: 'created_at',    type: 'number' },
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
  ],
});
