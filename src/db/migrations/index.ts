import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

// v1 is the initial baseline schema — no upgrade migrations needed.
// When schema version is bumped in future Epics, add a migration entry here.
export default schemaMigrations({ migrations: [] });
