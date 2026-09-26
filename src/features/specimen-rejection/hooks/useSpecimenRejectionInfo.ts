import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';

import { database } from '@db/database';
import AnalysisResult from '@db/models/AnalysisResult';
import Specimen from '@db/models/Specimen';
import { latestAnalysisResultsBySpecimen } from '@db/latestAnalysisResultsBySpecimen';
import type { SpecimenStatus } from '@app-types/enums';

import { getRejectBlockedReason } from '@features/queue/lib/sampleState';

export interface SpecimenInfo {
  sampleUid: string;
  patientUid: string;
  serverId: string | null;
  status: SpecimenStatus;
}

export interface UseSpecimenRejectionInfoResult {
  specimenInfo: SpecimenInfo | null;
  isLoadingSpecimen: boolean;
  /** Non-null when the workflow disallows rejecting this specimen right now. */
  blockedReason: string | null;
}

/**
 * @description Loads the specimen and its latest analysis result live via WatermelonDB,
 * and derives whether rejection is currently blocked. This screen is reachable straight
 * from the Queue and from a notification (not only from Sample Detail), so it enforces
 * the block rule itself rather than trusting the caller.
 * @param specimenId - Local specimen id from the route.
 */
export function useSpecimenRejectionInfo(specimenId: string): UseSpecimenRejectionInfoResult {
  const [specimenInfo, setSpecimenInfo] = useState<SpecimenInfo | null>(null);
  const [resultStatus, setResultStatus] = useState<AnalysisResult['status'] | null>(null);
  const [isLoadingSpecimen, setIsLoadingSpecimen] = useState(true);

  useEffect(() => {
    if (!specimenId) return;

    const sub = database
      .get<Specimen>('specimens')
      .query(Q.where('id', specimenId))
      .observeWithColumns(['status', 'server_id'])
      .subscribe((results) => {
        if (results[0]) {
          setSpecimenInfo({
            sampleUid: results[0].sampleUid,
            patientUid: results[0].patientUid,
            serverId: results[0].serverId,
            status: results[0].status as SpecimenStatus,
          });
        }
        setIsLoadingSpecimen(false);
      });
    return () => sub.unsubscribe();
  }, [specimenId]);

  const specimenServerId = specimenInfo?.serverId;
  useEffect(() => {
    if (!specimenServerId) return;

    const sub = database
      .get<AnalysisResult>('analysis_results')
      .query(Q.where('specimen_id', specimenServerId))
      .observeWithColumns(['status'])
      .subscribe((results) => {
        setResultStatus(
          latestAnalysisResultsBySpecimen(results).get(specimenServerId)?.status ?? null,
        );
      });
    return () => sub.unsubscribe();
  }, [specimenServerId]);

  const blockedReason = specimenInfo
    ? getRejectBlockedReason(specimenInfo.status, resultStatus)
    : null;

  return { specimenInfo, isLoadingSpecimen, blockedReason };
}
