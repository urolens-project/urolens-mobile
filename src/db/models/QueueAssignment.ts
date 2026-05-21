import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class QueueAssignment extends Model {
  static table = 'queue_assignments';

  @field('server_id')   serverId!: string | null;
  @field('specimen_id') specimenId!: string;
  @field('medtech_id')  medtechId!: string;
  @field('assigned_at') assignedAt!: string;
  @field('status')      status!: string;
  @field('synced_at')   syncedAt!: string | null;
}
