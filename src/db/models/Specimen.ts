import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class Specimen extends Model {
  static table = 'specimens';

  @field('server_id')      serverId!: string | null;
  @field('sample_uid')     sampleUid!: string;
  @field('patient_name')   patientName!: string;
  @field('patient_uid')    patientUid!: string;
  @field('test_type')      testType!: string;
  @field('status')         status!: string;
  @field('priority_level') priorityLevel!: string | null;
  @field('received_at')    receivedAt!: string;
  @field('assigned_at')    assignedAt!: string | null;
  @field('medtech_id')       medtechId!: string | null;
  @field('rejection_reason') rejectionReason!: string | null;
  @field('rejection_note')   rejectionNote!: string | null;
  @field('rejected_at')      rejectedAt!: string | null;
  @field('synced_at')        syncedAt!: string | null;
}
