import type { PriorityLevel } from '../queue/types';

// Read-only "done" states — everything the MedTech has finished acting on.
// RETURNED_FOR_CORRECTION is deliberately excluded: that one goes back into
// the Queue (SRS UC 3.4), it isn't finished.
export type ReportCategory = 'PENDING_APPROVAL' | 'APPROVED' | 'RELEASED' | 'REJECTED';

export const REPORT_CATEGORY_ORDER: ReportCategory[] = [
  'PENDING_APPROVAL',
  'APPROVED',
  'RELEASED',
  'REJECTED',
];

export const REPORT_CATEGORY_TITLES: Record<ReportCategory, string> = {
  PENDING_APPROVAL: 'Pending Supervisor Approval',
  APPROVED: 'Approved by Supervisor',
  RELEASED: 'Released',
  REJECTED: 'Rejected',
};

export interface ReportItem {
  id: string;
  sampleUid: string;
  patientUid: string;
  testType: string;
  priorityLevel: PriorityLevel | null;
  receivedAt: string;
  category: ReportCategory;
  // When this item reached its category — confirmedAt for result-driven
  // categories, rejectedAt for REJECTED. Used for within-section sorting.
  finalizedAt: string;
  rejectionReason: string | null;
}

export interface ReportSection {
  category: ReportCategory;
  title: string;
  data: ReportItem[];
}
