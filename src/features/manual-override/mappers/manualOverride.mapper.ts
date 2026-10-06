import type { components } from '@app-types/api';
import type AnalysisResult from '@db/models/AnalysisResult';
import type ManualOverride from '@db/models/ManualOverride';

import type { ManualOverrideRecord, OverrideContext } from '../types';

/**
 * @description Preserves server-authoritative values and identity in the immediate local result display.
 * @param dto - Accepted override response.
 */
export function mapManualOverride(
  dto: components['schemas']['OverrideResponse'],
): ManualOverrideRecord {
  return {
    id: dto.id,
    serverId: dto.id,
    resultId: dto.resultId,
    parameter: dto.parameter,
    originalAiValue: dto.originalAiValue,
    correctedValue: dto.correctedValue,
    rationale: dto.rationale,
    overriddenBy: dto.overriddenBy,
    createdAt: Date.parse(dto.overriddenAt),
    isSynced: true,
  };
}

/**
 * @description Reads the immutable AI count separately from the latest correction and freezes finalized results.
 * @param result - Locally synced analysis result.
 * @param latestOverride - Latest correction for the selected parameter.
 * @param parameter - Original AI findings key.
 */
export function mapOverrideContext(
  result: AnalysisResult | null,
  latestOverride: ManualOverride | null,
  parameter: string,
): OverrideContext {
  const count = result?.aiFindings[parameter];
  const originalAiValue =
    typeof count === 'number' && Number.isFinite(count) && count >= 0 ? count : null;
  return {
    originalAiValue,
    currentValue: latestOverride?.correctedValue ?? originalAiValue,
    canEdit:
      originalAiValue !== null &&
      (result?.status === 'PENDING_CONFIRM' || result?.status === 'RETURNED_FOR_CORRECTION'),
  };
}
