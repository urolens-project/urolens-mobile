import { Platform } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import { schema } from './schema';
import migrations from './migrations';
import Specimen from './models/Specimen';
import QueueAssignment from './models/QueueAssignment';
import AnalysisResult from './models/AnalysisResult';
import ManualOverride from './models/ManualOverride';
import PendingSync from './models/PendingSync';

let adapter;

if (Platform.OS === 'web') {
  // Safe fallback to prevent Metro from crawling native SQLite files during Web/SSR passes
  const LokiJSAdapter = require('@nozbe/watermelondb/adapters/lokijs').default;
  adapter = new LokiJSAdapter({
    useWebWorker: false,
    useIncrementalIndexedDB: true,
  });
} else {
  // Safely extract the commonJS default export structure of WatermelonDB
  const SQLiteAdapterRaw = require('@nozbe/watermelondb/adapters/sqlite');
  const SQLiteAdapter = SQLiteAdapterRaw.default || SQLiteAdapterRaw;
  
  // jsi: true requires a custom native build — not available in Expo Go.
  // Use default (jsi: false) for Expo Go dev; enable only in EAS production builds.
  adapter = new SQLiteAdapter({
    schema,
    migrations,
    onSetUpError: (error: any) => {
      console.error('[WatermelonDB] Setup error:', error);
    },
  });
}

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