import type Specimen from '@db/models/Specimen';
import type { SpecimenStatus } from '@app-types/enums';

import type { RejectionReceipt, SpecimenInfo, SpecimenRejectResponse } from '../types';

/**
 * @description Maps the rejection response to the local receipt, using the server timestamp.
 * @param dto - Accepted rejection response.
 */
export function mapRejectionToReceipt(dto: SpecimenRejectResponse): RejectionReceipt {
  return { specimenId: dto.specimenId, rejectedAt: dto.rejectedAt };
}

/**
 * @description Exposes only the specimen identifiers and status needed by the rejection screen.
 * @param specimen - Local specimen record.
 */
export function mapSpecimenToRejectionInfo(specimen: Specimen): SpecimenInfo {
  return {
    sampleUid: specimen.sampleUid,
    patientUid: specimen.patientUid,
    serverId: specimen.serverId,
    status: specimen.status as SpecimenStatus,
  };
}
