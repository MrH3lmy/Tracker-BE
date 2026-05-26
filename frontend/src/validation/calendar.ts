export interface CalendarInputErrors {
  year?: string;
  month?: string;
}

export function validateCalendarInputs(yearRaw: string, monthRaw: string): CalendarInputErrors {
  const errors: CalendarInputErrors = {};

  if (!/^\d{4}$/.test(yearRaw.trim())) {
    errors.year = 'Year must be a 4-digit number (e.g., 2026).';
  }

  const monthValue = Number(monthRaw.trim());
  if (!/^\d{1,2}$/.test(monthRaw.trim()) || !Number.isInteger(monthValue) || monthValue < 1 || monthValue > 12) {
    errors.month = 'Month must be an integer from 1 to 12.';
  }

  return errors;
}
