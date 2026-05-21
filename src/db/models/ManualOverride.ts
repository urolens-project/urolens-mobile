import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class ManualOverride extends Model {
  static table = 'manual_overrides';

  @field('server_id')         serverId!: string | null;
  @field('result_id')         resultId!: string;
  @field('parameter_name')    parameterName!: string;
  @field('original_ai_value') originalAiValue!: string;
  @field('corrected_value')   correctedValue!: string;
  @field('rationale')         rationale!: string;
  @field('is_synced')         isSynced!: boolean;
  @field('synced_at')         syncedAt!: string | null;
}
