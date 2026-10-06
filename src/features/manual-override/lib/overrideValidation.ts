import { MAX_OVERRIDE_COUNT, MAX_OVERRIDE_RATIONALE_LENGTH } from '../constants/override.constant';

/**
 * @description Rejects partial numeric strings and counts the backend cannot accept, including offline edits.
 * @param value - Entered corrected count.
 */
export function parseOverrideCount(value: string): number | null {
  const text = value.trim();
  if (!/^\d+$/.test(text)) return null;
  const count = Number(text);
  return Number.isSafeInteger(count) && count <= MAX_OVERRIDE_COUNT ? count : null;
}

/**
 * @description Provides one validation rule for the form and submission boundary.
 * @param count - Parsed corrected count.
 * @param rationale - Explanation entered by the reviewer.
 * @param currentValue - Latest effective count; a correction must change it.
 */
export function getOverrideValidationError(
  count: number | null,
  rationale: string,
  currentValue: number | null,
): string | null {
  if (count === null || !Number.isSafeInteger(count) || count < 0 || count > MAX_OVERRIDE_COUNT)
    return `Enter a whole number from 0 to ${MAX_OVERRIDE_COUNT}.`;
  if (count === currentValue) return 'The corrected value must differ from the current value.';
  if (!rationale.trim()) return 'Enter a rationale for this correction.';
  if (rationale.trim().length > MAX_OVERRIDE_RATIONALE_LENGTH)
    return `Keep the rationale within ${MAX_OVERRIDE_RATIONALE_LENGTH} characters.`;
  return null;
}
