import { latestAnalysisResultsBySpecimen } from '@db/latestAnalysisResultsBySpecimen';
import type AnalysisResult from '@db/models/AnalysisResult';
import type { ResultStatus } from '@db/models/AnalysisResult';
import type Specimen from '@db/models/Specimen';

import { REPORT_CATEGORY_ORDER, REPORT_CATEGORY_TITLES } from '../types';
import type { ReportCategory, ReportItem, ReportSection } from '../types';

function resultStatusToCategory(status: ResultStatus): ReportCategory | null {
  switch (status) {
    case 'PENDING_SUPERVISOR_APPROVAL':
      return 'PENDING_APPROVAL';
    case 'CRITICAL_ESCALATED':
      return 'ESCALATED';
    case 'APPROVED':
      return 'APPROVED';
    case 'RELEASED':
      return 'RELEASED';
    default:
      return null;
  }
}

/**
 * @description The date a result actually reached its category, for correct within-section
 * sorting — not just whichever date happens to be set. Approved/Released sort by their own
 * dates rather than confirmedAt, which is just when the MedTech submitted it.
 */
function finalizedAtForCategory(
  category: ReportCategory,
  result: AnalysisResult,
  specimen: Specimen,
): string {
  switch (category) {
    case 'APPROVED':
      return result.approvedAt ?? result.confirmedAt ?? specimen.receivedAt;
    case 'RELEASED':
      return result.releasedAt ?? result.confirmedAt ?? specimen.receivedAt;
    default:
      return result.confirmedAt ?? specimen.receivedAt;
  }
}

function mapSpecimenToReportItem(
  specimen: Specimen,
  category: ReportCategory,
  finalizedAt: string,
): ReportItem {
  return {
    id: specimen.id,
    sampleUid: specimen.sampleUid,
    patientUid: specimen.patientUid,
    testType: specimen.testType,
    priorityLevel: specimen.priorityLevel as ReportItem['priorityLevel'],
    receivedAt: specimen.receivedAt,
    category,
    finalizedAt,
    rejectionReason: category === 'REJECTED' ? specimen.rejectionReason : null,
  };
}

/**
 * @description Joins local specimens with their latest result so reports contain
 * one current status per sample, including older records retained on the device.
 * @param specimens - Synced specimens and local rejections.
 * @param results - All result statuses, including ones that belong back in Queue.
 */
export function mapReportsToUi(specimens: Specimen[], results: AnalysisResult[]): ReportSection[] {
  const specimenByServerId = new Map<string, Specimen>();
  const items: ReportItem[] = [];

  for (const specimen of specimens) {
    if (specimen.serverId) specimenByServerId.set(specimen.serverId, specimen);
    if (specimen.status === 'REJECTED') {
      items.push(
        mapSpecimenToReportItem(specimen, 'REJECTED', specimen.rejectedAt ?? specimen.receivedAt),
      );
    }
  }

  // A stale duplicate result must not keep a sample under its previous status.
  for (const result of latestAnalysisResultsBySpecimen(results).values()) {
    const category = resultStatusToCategory(result.status);
    const specimen = specimenByServerId.get(result.specimenId);
    if (!category || !specimen || specimen.status === 'REJECTED') continue;
    items.push(
      mapSpecimenToReportItem(
        specimen,
        category,
        finalizedAtForCategory(category, result, specimen),
      ),
    );
  }

  return REPORT_CATEGORY_ORDER.map(
    (category): ReportSection => ({
      category,
      title: REPORT_CATEGORY_TITLES[category],
      data: items
        .filter((item): boolean => item.category === category)
        .sort(
          (first, second): number =>
            new Date(second.finalizedAt).getTime() - new Date(first.finalizedAt).getTime(),
        ),
    }),
  );
}
