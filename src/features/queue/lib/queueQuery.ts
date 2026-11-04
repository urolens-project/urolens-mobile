import { Q } from '@nozbe/watermelondb';

import { clinicDayRange } from '@lib/dateTime';

import type { FilterOption, SpecimenStatus } from '../types';

// The Queue's own actionable statuses (SRS UC 2.2 + product decision). IN_QUEUE
// (unassigned pool) counts as active work too — the backend treats it as
// startable (queue_service._ACTIVE_WORK_STATUSES, specimen_service.
// STARTABLE_SPECIMEN_STATUSES) even though nothing sets it today; older rows
// may have it. A sample returned for correction (UC 3.4) is included
// separately below since that's a property of its analysis_results row, not
// the specimen's status.
export const QUEUE_STATUSES: SpecimenStatus[] = ['ASSIGNED', 'PROCESSING', 'IN_QUEUE'];
// Backend only ever advances specimen.status to COMPLETED once a Supervisor
// approves/releases — it stays ASSIGNED for the entire window from MedTech
// confirmation through Supervisor review. Without this, a specimen the
// MedTech already confirmed (nothing left for them to do) keeps showing in
// their Queue until a Supervisor finally acts on it. CRITICAL_ESCALATED is
// included defensively — nothing sets it today (supervisor queries only read
// it), but it would otherwise keep a sample in the Queue as PROCESSING/ASSIGNED.
export const FINISHED_RESULT_STATUSES = [
  'PENDING_SUPERVISOR_APPROVAL',
  'APPROVED',
  'RELEASED',
  'CRITICAL_ESCALATED',
];
export const RETURNED_RESULT_STATUS = 'RETURNED_FOR_CORRECTION';

/**
 * @description Samples in scope for "the Queue": ASSIGNED/PROCESSING by status — minus
 * anything whose latest result means the MedTech has nothing left to do
 * (finishedServerIds) — OR returned-for-correction by server_id regardless
 * of specimen status (it may already be COMPLETED — the correction flag
 * lives on the result, not the specimen).
 * @param returnedServerIds - Server ids of specimens returned for correction.
 * @param finishedServerIds - Server ids of specimens with nothing left for the MedTech to do.
 */
export function baseClause(returnedServerIds: string[], finishedServerIds: string[]): Q.Clause {
  const statusClause =
    finishedServerIds.length === 0
      ? Q.where('status', Q.oneOf(QUEUE_STATUSES))
      : Q.and(
          Q.where('status', Q.oneOf(QUEUE_STATUSES)),
          Q.where('server_id', Q.notIn(finishedServerIds)),
        );

  if (returnedServerIds.length === 0) return statusClause;
  return Q.or(statusClause, Q.where('server_id', Q.oneOf(returnedServerIds)));
}

// The Date filter: what needs the MedTech's attention today. Received today,
// plus work already started or sent back — an In Progress or Returned sample
// stays visible no matter what day it arrived, otherwise picking Date would hide
// the very samples a MedTech is in the middle of. (Always applied on top of
// baseClause, so anything finished or out of the Queue stays out.)
function dateClause(returnedServerIds: string[]): Q.Clause {
  const { start, end } = clinicDayRange();
  const receivedToday = Q.and(
    Q.where('received_at', Q.gte(start)),
    Q.where('received_at', Q.lte(end)),
  );
  const startedWork = [Q.where('status', 'PROCESSING')];
  if (returnedServerIds.length > 0) {
    startedWork.push(Q.where('server_id', Q.oneOf(returnedServerIds)));
  }
  return Q.or(receivedToday, ...startedWork);
}

/**
 * @description The WatermelonDB query clauses for a given Queue filter. Exported for
 * tests. A status chip (Assigned/Processing/Capturing/Verifying/Returned) loads the
 * Queue's usual scope and nothing more — which of those five statuses a row actually
 * has is decided by getQueueStatus, in memory (useQueue.ts), the same rule the badge,
 * counts and sort already use, so the chip can never disagree with them.
 * @param filter - The active queue filter.
 * @param returnedServerIds - Server ids currently flagged returned-for-correction.
 * @param finishedServerIds - Server ids whose latest result means the MedTech is done.
 */
export function buildQuery(
  filter: FilterOption,
  returnedServerIds: string[],
  finishedServerIds: string[],
): Q.Clause[] {
  switch (filter) {
    case 'DATE':
      return [
        baseClause(returnedServerIds, finishedServerIds),
        dateClause(returnedServerIds),
        Q.sortBy('received_at', Q.desc),
      ];
    case 'LATEST':
      return [baseClause(returnedServerIds, finishedServerIds), Q.sortBy('received_at', Q.desc)];
    case 'EARLIEST':
      return [baseClause(returnedServerIds, finishedServerIds), Q.sortBy('received_at', Q.asc)];
    case 'STATUS':
    case 'ASSIGNED':
    case 'PROCESSING':
    case 'CAPTURING':
    case 'VERIFYING':
    case 'RETURNED':
    case 'ALL':
    default:
      return [baseClause(returnedServerIds, finishedServerIds)];
  }
}
