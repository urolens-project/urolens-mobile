// Path: urolens-mobile/src/db/models/ManualOverride.ts
import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class ManualOverride extends Model {
  static table = 'manual_overrides';

  @field('server_id') serverId!: string | null;
  @field('result_id') resultId!: string;
  @field('parameter') parameter!: string;
  @field('original_ai_value') originalAiValue!: number;
  @field('corrected_value') correctedValue!: number;
  @field('rationale') rationale!: string;
  @field('overridden_by') overriddenBy!: string;
  // is_synced drives CLIENT_WINS conflict resolution in conflictResolver.ts
  @field('is_synced') isSynced!: boolean;
  @field('created_at') createdAt!: string;
  @field('synced_at') syncedAt!: string | null;
}