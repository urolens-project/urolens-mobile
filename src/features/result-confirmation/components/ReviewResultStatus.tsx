import { ResultStatusBanner } from '@features/sample/components/ResultStatusBanner';

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
  const missingReason = isDetailAvailable
    ? 'The supervisor returned this result without a reason. Contact the supervisor before correcting it.'
    : 'Connect and reload the result to view the supervisor’s correction reason.';
  if (status === 'RETURNED_FOR_CORRECTION')
    return (
      <ResultStatusBanner
        variant="correction"
        title="Returned for Correction"
        body={returnReason || missingReason}
      />
    );
  if (status === 'PENDING_SUPERVISOR_APPROVAL')
    return <ResultStatusBanner variant="pending" title="Awaiting supervisor review." />;
  if (status === 'APPROVED')
    return (
      <ResultStatusBanner
        variant="approved"
        title="Approved by Supervisor"
        body="This result is ready for release."
      />
    );
  if (status === 'RELEASED')
    return (
      <ResultStatusBanner
        variant="released"
        title="Result Released"
        body="This result has been released to the patient."
      />
    );
  if (status === 'CRITICAL_ESCALATED')
    return (
      <ResultStatusBanner
        variant="escalated"
        title="Critical / Escalated"
        body="The supervisor has escalated this result for urgent review."
      />
    );
  return null;
}
