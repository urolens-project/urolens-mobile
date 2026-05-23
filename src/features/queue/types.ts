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
export type FilterOption = 'ALL' | 'DATE' | 'PRIORITY' | 'HIGH' | 'NORMAL' | 'STATUS' | 'ASSIGNED' | 'PROCESSING';

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
  rejectionReason: string | null;
  rejectionNote: string | null;
  rejectedAt: string | null;
  syncedAt: string | null;
}
