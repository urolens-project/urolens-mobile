import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

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
  ],
});
