import type { components } from '@app-types/api';
import type { RejectionReason, SpecimenStatus } from '@app-types/enums';

type SpecimenRejectDto = components['schemas']['SpecimenRejectRequest'];

export interface SpecimenRejectRequest extends SpecimenRejectDto {
  reasonCode: RejectionReason;
}

export type SpecimenRejectResponse = components['schemas']['SpecimenRejectResponse'];

export interface RejectionReceipt {
  specimenId: string;
  rejectedAt: string;
}

export interface SpecimenInfo {
  sampleUid: string;
  patientUid: string;
  serverId: string | null;
  status: SpecimenStatus;
}

export interface SuccessfulRejection {
  status: 'rejected';
  isQueued: boolean;
}

export interface FailedRejection {
  status: 'failed';
  message: string;
}

interface BusyRejection {
  status: 'busy';
}

export type RejectResult = SuccessfulRejection | FailedRejection | BusyRejection;
