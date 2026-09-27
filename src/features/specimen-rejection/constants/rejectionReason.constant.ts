import { RejectionReason } from '@app-types/enums';

export interface RejectionReasonOption {
  value: RejectionReason;
  label: string;
  description: string;
}

export const REJECTION_REASONS: RejectionReasonOption[] = [
  {
    value: RejectionReason.INSUFFICIENT_VOLUME,
    label: 'Insufficient Volume',
    description: 'Sample volume is below the minimum required threshold.',
  },
  {
    value: RejectionReason.WRONG_CONTAINER,
    label: 'Wrong Container',
    description: 'Sample collected in an incompatible or incorrect container.',
  },
  {
    value: RejectionReason.UNLABELED,
    label: 'Unlabeled Specimen',
    description: 'Sample container is missing required patient identification.',
  },
  {
    value: RejectionReason.OTHER,
    label: 'Other',
    description: 'Another reason not listed above — specify in the notes field.',
  },
];
