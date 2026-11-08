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

/**
 * @description Formats an ISO timestamp for compact display, e.g. "Sep 20, 12:30 PM".
 * @param iso - ISO timestamp, or null/undefined to render as "—".
 */
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

/**
 * @description Formats an ISO timestamp with the year, e.g. "Sep 20, 2026, 12:30 PM" —
 * for detail views, where an older sample's year matters.
 * @param iso - ISO timestamp, or null/undefined to render as "—".
 */
export function formatDateTime(iso: string | null | undefined): string {
  const date = parse(iso);
  if (!date) return '—';
  return date.toLocaleString('en-US', {
    timeZone: CLINIC_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * @description Formats an ISO timestamp as a short date, e.g. "Sep 20".
 * @param iso - ISO timestamp, or null/undefined to render as "—".
 */
export function formatShortDate(iso: string | null | undefined): string {
  const date = parse(iso);
  if (!date) return '—';
  return date.toLocaleDateString('en-US', {
    timeZone: CLINIC_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  });
}

/**
 * @description Formats today's date at the clinic, e.g. "Sep 20, 2026".
 * @param now - Reference instant. Defaults to the current time.
 */
export function formatClinicToday(now: Date = new Date()): string {
  return now.toLocaleDateString('en-US', {
    timeZone: CLINIC_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export interface ClinicDayRange {
  start: string;
  end: string;
}

/**
 * @description Start and end of the clinic's current day, as UTC ISO strings — the
 * bounds for "received today" (received_at is stored in UTC).
 * @param now - Reference instant. Defaults to the current time.
 */
export function clinicDayRange(now: Date = new Date()): ClinicDayRange {
  const clinicDate = new Date(now.getTime() + CLINIC_UTC_OFFSET_MS).toISOString().slice(0, 10);
  return {
    start: new Date(`${clinicDate}T00:00:00.000+08:00`).toISOString(),
    end: new Date(`${clinicDate}T23:59:59.999+08:00`).toISOString(),
  };
}
