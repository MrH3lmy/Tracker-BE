/**
 * Helpers for backend date-only (YYYY-MM-DD, no time/timezone) values.
 * Always parse/format via UTC so a date-only value never shifts by a day
 * depending on the viewer's local timezone offset.
 */

const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (ISO_DATE_ONLY_PATTERN.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) return date;
    return null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateOnlyKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function todayDateOnlyKey(): string {
  const now = new Date();
  return toDateOnlyKey(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function addDaysToDateOnlyKey(key: string, days: number): string {
  const date = parseDateOnly(key);
  if (!date) return key;
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnlyKey(date);
}

const longDateFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const shortDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function formatDateOnly(value?: string | null, fallback = 'Date unavailable'): string {
  const date = parseDateOnly(value);
  return date ? longDateFormatter.format(date) : fallback;
}

export function formatDateOnlyShort(value?: string | null, fallback = 'Date unavailable'): string {
  const date = parseDateOnly(value);
  if (!date) return fallback;
  const shortDate = shortDateFormatter.format(date);
  return toDateOnlyKey(date) === todayDateOnlyKey() ? `Today, ${shortDate}` : shortDate;
}
