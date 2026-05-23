import { QueueItem } from '@app-types/domain';
import { SpecimenStatus } from '@app-types/enums';

export const mockQueueItems: QueueItem[] = [
  {
    specimen_id: 'spec-001',
    sample_uid: 'SMPL-A3K9X1',
    patient_name: 'Juan Dela Cruz',
    time_received: new Date(Date.now() - 3600000).toISOString(),
    priority_level: 'HIGH',
    status: SpecimenStatus.ASSIGNED,
  },
  {
    specimen_id: 'spec-002',
    sample_uid: 'SMPL-B7M2Z4',
    patient_name: 'Maria Santos',
    time_received: new Date(Date.now() - 7200000).toISOString(),
    priority_level: 'NORMAL',
    status: SpecimenStatus.ASSIGNED,
  },
  {
    specimen_id: 'spec-003',
    sample_uid: 'SMPL-C1P5W8',
    patient_name: 'Roberto Reyes',
    time_received: new Date(Date.now() - 1800000).toISOString(),
    priority_level: 'NORMAL',
    status: SpecimenStatus.IN_QUEUE,
  },
];
