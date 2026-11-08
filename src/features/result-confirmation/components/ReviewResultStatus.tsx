import { ResultStatusBanner } from '@features/sample/components/ResultStatusBanner';

import { RESULT_CONFIRMATION_TEXT } from '../constants/resultConfirmationText.constant';

export interface ReviewResultStatusProps {
  status: string;
  returnReason: string | null;
  isDetailAvailable: boolean;
}

/**
 * @description Explains the result's review stage and the supervisor's reason for returning it.
 * @param props - Current status and latest return reason.
 */
export function ReviewResultStatus({
  status,
  returnReason,
  isDetailAvailable,
}: ReviewResultStatusProps): React.JSX.Element | null {
  const reviewStatusText = RESULT_CONFIRMATION_TEXT.reviewStatus;
  const missingReason = isDetailAvailable
    ? reviewStatusText.missingReasonWithDetail
    : reviewStatusText.missingReasonWithoutDetail;
  if (status === 'RETURNED_FOR_CORRECTION')
    return (
      <ResultStatusBanner
        variant="correction"
        title={reviewStatusText.returnedForCorrectionTitle}
        body={returnReason || missingReason}
      />
    );
  if (status === 'PENDING_SUPERVISOR_APPROVAL')
    return <ResultStatusBanner variant="pending" title={reviewStatusText.pendingSupervisorTitle} />;
  if (status === 'APPROVED')
    return (
      <ResultStatusBanner
        variant="approved"
        title={reviewStatusText.approvedTitle}
        body={reviewStatusText.approvedBody}
      />
    );
  if (status === 'RELEASED')
    return (
      <ResultStatusBanner
        variant="released"
        title={reviewStatusText.releasedTitle}
        body={reviewStatusText.releasedBody}
      />
    );
  if (status === 'CRITICAL_ESCALATED')
    return (
      <ResultStatusBanner
        variant="escalated"
        title={reviewStatusText.escalatedTitle}
        body={reviewStatusText.escalatedBody}
      />
    );
  return null;
}
