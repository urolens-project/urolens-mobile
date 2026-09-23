import {
  clinicDayRange,
  formatClinicToday,
  formatDateTime,
  formatShortDate,
  formatShortDateTime,
} from '../../src/lib/dateTime';

// The clinic is on Philippine time (UTC+8, no daylight saving). Everything here is
// asserted against fixed instants, so results can't depend on the phone's timezone.
describe('formatShortDateTime', () => {
  it('shows the clinic date and time', () => {
    // 04:30 UTC is 12:30 PM in Manila
    expect(formatShortDateTime('2026-09-20T04:30:00.000Z')).toBe('Sep 20, 12:30 PM');
  });

  it('rolls over to the next clinic day when UTC is still the day before', () => {
    // 20:00 UTC on the 19th is 4:00 AM on the 20th in Manila
    expect(formatShortDateTime('2026-09-19T20:00:00Z')).toBe('Sep 20, 4:00 AM');
  });

  it('accepts the +00:00 timestamps the backend sends', () => {
    expect(formatShortDateTime('2026-09-12T13:01:12.882298+00:00')).toBe('Sep 12, 9:01 PM');
  });

  it.each([null, undefined, '', 'not a date'])('shows a dash for %p', (value) => {
    expect(formatShortDateTime(value as string | null | undefined)).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('shows the clinic date with the year, and the time', () => {
    // 04:30 UTC is 12:30 PM in Manila
    expect(formatDateTime('2026-09-20T04:30:00.000Z')).toBe('Sep 20, 2026, 12:30 PM');
  });

  it('keeps the year so an older sample is not mistaken for a recent one', () => {
    expect(formatDateTime('2025-01-05T02:05:00Z')).toBe('Jan 5, 2025, 10:05 AM');
  });

  it('uses the clinic day, not UTC', () => {
    expect(formatDateTime('2026-09-19T20:00:00Z')).toBe('Sep 20, 2026, 4:00 AM');
  });

  it('shows a dash for a missing or invalid date, not "Invalid Date"', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('not a date')).toBe('—');
  });
});

describe('formatShortDate', () => {
  it('shows just the clinic date', () => {
    expect(formatShortDate('2026-09-19T20:00:00Z')).toBe('Sep 20');
  });

  it('shows a dash for a missing or invalid date', () => {
    expect(formatShortDate(null)).toBe('—');
    expect(formatShortDate('nope')).toBe('—');
  });
});

describe('formatClinicToday', () => {
  it('uses the clinic date even when it is still the previous day in UTC', () => {
    expect(formatClinicToday(new Date('2026-09-19T20:00:00Z'))).toBe('Sep 20, 2026');
  });
});

describe('clinicDayRange', () => {
  it("covers the clinic's whole day, expressed in UTC", () => {
    // Midday in Manila on Sep 20
    expect(clinicDayRange(new Date('2026-09-20T04:00:00Z'))).toEqual({
      start: '2026-09-19T16:00:00.000Z',
      end: '2026-09-20T15:59:59.999Z',
    });
  });

  it('follows the clinic clock, not UTC: 20:00 UTC is already the next day in Manila', () => {
    expect(clinicDayRange(new Date('2026-09-19T20:00:00Z'))).toEqual({
      start: '2026-09-19T16:00:00.000Z',
      end: '2026-09-20T15:59:59.999Z',
    });
  });

  it('is still the previous day one millisecond before Manila midnight', () => {
    expect(clinicDayRange(new Date('2026-09-19T15:59:59.999Z'))).toEqual({
      start: '2026-09-18T16:00:00.000Z',
      end: '2026-09-19T15:59:59.999Z',
    });
  });

  it('rolls over exactly at Manila midnight', () => {
    expect(clinicDayRange(new Date('2026-09-19T16:00:00.000Z')).start).toBe(
      '2026-09-19T16:00:00.000Z',
    );
  });

  it('spans exactly one day', () => {
    const { start, end } = clinicDayRange(new Date('2026-03-01T00:00:00Z'));
    expect(new Date(end).getTime() - new Date(start).getTime()).toBe(24 * 60 * 60 * 1000 - 1);
  });
});
