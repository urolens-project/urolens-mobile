import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class PendingSync extends Model {
  static table = 'pending_sync';

  @field('entity')        entity!: string;
  @field('entity_id')     entityId!: string;
  @field('action')        action!: string;
  @field('payload_json')  payloadJson!: string;
  @field('status')        status!: string;
  @field('error_message') errorMessage!: string | null;
  @field('created_at')    createdAt!: string;
  @field('attempted_at')  attemptedAt!: string | null;

  get payload(): Record<string, unknown> {
    try {
      return JSON.parse(this.payloadJson);
    } catch {
      return {};
    }
  }
}
