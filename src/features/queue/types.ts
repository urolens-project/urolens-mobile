export type PriorityLevel = 'HIGH' | 'NORMAL' | 'LOW';

export type SpecimenStatus =
  | 'IN_QUEUE'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED';

// Per SDD/SRS & Mobile Developer Guide (STORY-MOB-05):
// Filter chips — All · High (priority) · Normal (priority) · Assigned (status) · Processing (status)
export type FilterOption = 'ALL' | 'HIGH' | 'NORMAL' | 'ASSIGNED' | 'PROCESSING';

export interface QueueItem {
  id: string;
  serverId: string | null;
  sampleUid: string;
  patientName: string;
  patientUid: string;
  testType: string;
  status: SpecimenStatus;
  priorityLevel: PriorityLevel | null;
  receivedAt: string;
  medtechId: string | null;
  syncedAt: string | null;
}
