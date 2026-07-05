import { parseJsonObject, type ValidationResult } from './json';

export const EXCLUDED_WEEKDAYS_KEY = 'excludedWeekdays';
export const HOLIDAY_DATES_KEY = 'holidayDates';
export const DEFAULT_DAILY_CAPACITY_HOURS_KEY = 'defaultDailyCapacityHours';
export const AI_FEATURES_ENABLED_KEY = 'aiFeaturesEnabled';

const weekdays = new Set(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);
const isoDateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const isValidIsoDate = (value: string) => {
  if (!isoDateOnlyPattern.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export function validateSettingsPayload(text: string): ValidationResult<Record<string, unknown>> {
  const result = parseJsonObject(text);
  if (!result.parsed) return result;

  const errors: string[] = [];
  const excludedWeekdays = result.parsed[EXCLUDED_WEEKDAYS_KEY];
  if (excludedWeekdays !== undefined) {
    if (!Array.isArray(excludedWeekdays)) {
      errors.push(`${EXCLUDED_WEEKDAYS_KEY} must be an array of weekday names.`);
    } else {
      excludedWeekdays.forEach((weekday, index) => {
        if (typeof weekday !== 'string' || !weekdays.has(weekday.trim().toUpperCase())) {
          errors.push(`${EXCLUDED_WEEKDAYS_KEY}[${index}] must be MONDAY through SUNDAY.`);
        }
      });
    }
  }

  const holidayDates = result.parsed[HOLIDAY_DATES_KEY];
  if (holidayDates !== undefined) {
    if (!Array.isArray(holidayDates)) {
      errors.push(`${HOLIDAY_DATES_KEY} must be an array of YYYY-MM-DD date strings.`);
    } else {
      holidayDates.forEach((holiday, index) => {
        if (typeof holiday !== 'string' || !isValidIsoDate(holiday.trim())) {
          errors.push(`${HOLIDAY_DATES_KEY}[${index}] must be a valid YYYY-MM-DD date.`);
        }
      });
    }
  }

  const aiFeaturesEnabled = result.parsed[AI_FEATURES_ENABLED_KEY];
  if (aiFeaturesEnabled !== undefined && typeof aiFeaturesEnabled !== 'boolean') {
    errors.push(`${AI_FEATURES_ENABLED_KEY} must be a boolean.`);
  }

  const dailyCapacity = result.parsed[DEFAULT_DAILY_CAPACITY_HOURS_KEY];
  if (dailyCapacity !== undefined) {
    if (typeof dailyCapacity !== 'number' || !Number.isFinite(dailyCapacity) || dailyCapacity <= 0 || dailyCapacity > 24) {
      errors.push(`${DEFAULT_DAILY_CAPACITY_HOURS_KEY} must be a number greater than 0 and no more than 24.`);
    }
  }

  return { parsed: result.parsed, errors };
}
