import type { components } from '@app-types/api';

import type { ReportItem } from '../types';

type MedtechHistoryItemDto = components['schemas']['MedtechHistoryItem'];

/**
 * @description Maps one page of GET /results/medtech/history into the same UI model the
 * local-DB Reports mapper produces, so historical and locally-synced items render identically.
 * @param dto - One sample from the history response.
 */
export function mapHistoryItemToReportItem(dto: MedtechHistoryItemDto): ReportItem {
  return {
    id: dto.specimenId,
    sampleUid: dto.sampleUid ?? '',
    patientUid: dto.patientUid ?? '',
    testType: dto.testType ?? '',
    priorityLevel: (dto.priorityLevel ?? null) as ReportItem['priorityLevel'],
    receivedAt: dto.receivedAt ?? dto.finalizedAt ?? '',
    category: dto.category,
    finalizedAt: dto.finalizedAt ?? dto.receivedAt ?? '',
    rejectionReason: dto.rejectionReason ?? null,
  };
}
