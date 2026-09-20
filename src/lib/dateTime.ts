// The lab runs on Philippine time. Every date shown or compared in the app goes
// through here, so a phone set to another timezone can't disagree with the
// clinic about what "today" is or what time a sample arrived.
export const CLINIC_TIME_ZONE = 'Asia/Manila';

// The Philippines has no daylight saving, so a fixed UTC+8 is exact.
const CLINIC_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Sep 20, 12:30 PM" */
export function formatShortDateTime(iso: string | null | undefined): string {
  const date = parse(iso);
  if (!date) return '—';
  return date.toLocaleString('en-US', {
    timeZone: CLINIC_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "Sep 20" */
export function formatShortDate(iso: string | null | undefined): string {
  const date = parse(iso);
  if (!date) return '—';
  return date.toLocaleDateString('en-US', {
    timeZone: CLINIC_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  });
}

/** "Sep 20, 2026" — today's date at the clinic. */
export function formatClinicToday(now: Date = new Date()): string {
  return now.toLocaleDateString('en-US', {
    timeZone: CLINIC_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Start and end of the clinic's current day, as UTC ISO strings — the bounds
 * for "received today" (received_at is stored in UTC).
 */
export function clinicDayRange(now: Date = new Date()): { start: string; end: string } {
  const clinicDate = new Date(now.getTime() + CLINIC_UTC_OFFSET_MS).toISOString().slice(0, 10);
  return {
    start: new Date(`${clinicDate}T00:00:00.000+08:00`).toISOString(),
    end: new Date(`${clinicDate}T23:59:59.999+08:00`).toISOString(),
  };
}
