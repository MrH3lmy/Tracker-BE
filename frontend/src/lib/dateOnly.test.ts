import { describe, expect, it } from 'vitest';
import { addDaysToDateOnlyKey, formatDateOnlyShort, parseDateOnly, toDateOnlyKey } from './dateOnly';

describe('parseDateOnly', () => {
  it('parses a plain YYYY-MM-DD string as UTC midnight, not local midnight', () => {
    const date = parseDateOnly('2026-01-01');
    expect(date?.getUTCFullYear()).toBe(2026);
    expect(date?.getUTCMonth()).toBe(0);
    expect(date?.getUTCDate()).toBe(1);
  });

  it('round-trips through toDateOnlyKey without shifting a day', () => {
    // This is the exact bug class Phase 5 exists to prevent: a naive `new Date(string)`
    // parse combined with local-time formatting can shift a date-only value by a day.
    expect(toDateOnlyKey(parseDateOnly('2026-12-31')!)).toBe('2026-12-31');
    expect(toDateOnlyKey(parseDateOnly('2026-01-01')!)).toBe('2026-01-01');
  });

  it('returns null for garbage input instead of an Invalid Date', () => {
    expect(parseDateOnly('not-a-date')).toBeNull();
    expect(parseDateOnly('')).toBeNull();
    expect(parseDateOnly(null)).toBeNull();
    expect(parseDateOnly(undefined)).toBeNull();
  });

  it('rejects a calendar-invalid date-only string (e.g. Feb 30) rather than silently rolling it over', () => {
    expect(parseDateOnly('2026-02-30')).toBeNull();
  });
});

describe('addDaysToDateOnlyKey', () => {
  it('crosses a month boundary correctly', () => {
    expect(addDaysToDateOnlyKey('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('crosses a year boundary correctly', () => {
    expect(addDaysToDateOnlyKey('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('handles a Feb 29 leap day correctly', () => {
    expect(addDaysToDateOnlyKey('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDaysToDateOnlyKey('2028-02-29', 1)).toBe('2028-03-01');
  });

  it('supports negative offsets', () => {
    expect(addDaysToDateOnlyKey('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('formatDateOnlyShort', () => {
  it('falls back gracefully for a missing value', () => {
    expect(formatDateOnlyShort(undefined, 'No date')).toBe('No date');
  });
});
