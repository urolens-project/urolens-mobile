import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import migrations from './migrations';
import Specimen from './models/Specimen';
import QueueAssignment from './models/QueueAssignment';
import AnalysisResult from './models/AnalysisResult';
import ManualOverride from './models/ManualOverride';
import PendingSync from './models/PendingSync';

// jsi: true requires a custom native build — not available in Expo Go.
// Use default (jsi: false) for Expo Go dev; enable only in EAS production builds.
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  onSetUpError: (error) => {
    console.error('[WatermelonDB] Setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    Specimen,
    QueueAssignment,
    AnalysisResult,
    ManualOverride,
    PendingSync,
  ],
});
