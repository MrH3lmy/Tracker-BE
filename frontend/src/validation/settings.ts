import { parseJsonObject, type ValidationResult } from './json';

export const EXCLUDED_WEEKDAYS_KEY = 'excludedWeekdays';
export const HOLIDAY_DATES_KEY = 'holidayDates';
export const DEFAULT_DAILY_CAPACITY_HOURS_KEY = 'defaultDailyCapacityHours';
export const AI_FEATURES_ENABLED_KEY = 'aiFeaturesEnabled';
export const WORKING_HOURS_KEY = 'workingHours';
export const SLEEP_HOURS_KEY = 'sleepHours';
export const HABIT_REMINDER_STYLE_KEY = 'habitReminders.style';

export const HABIT_REMINDER_STYLES = ['silent', 'gentle', 'standard', 'persistent'] as const;
export type HabitReminderStyle = (typeof HABIT_REMINDER_STYLES)[number];
export const DEFAULT_HABIT_REMINDER_STYLE: HabitReminderStyle = 'standard';

export const isHabitReminderStyle = (value: unknown): value is HabitReminderStyle =>
  typeof value === 'string' && (HABIT_REMINDER_STYLES as readonly string[]).includes(value);

export function readHabitReminderStyle(settings: unknown): HabitReminderStyle {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return DEFAULT_HABIT_REMINDER_STYLE;
  const value = (settings as Record<string, unknown>)[HABIT_REMINDER_STYLE_KEY];
  return isHabitReminderStyle(value) ? value : DEFAULT_HABIT_REMINDER_STYLE;
}

const weekdays = new Set(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);
const isoDateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const timeOfDayPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type TimeWindow = { start: string; end: string };
export type WeeklyHours = Record<string, TimeWindow | undefined>;

const validateWeeklyHours = (value: unknown, key: string, errors: string[]) => {
  if (value === undefined) return;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    errors.push(`${key} must be an object keyed by weekday name.`);
    return;
  }
  for (const [day, window] of Object.entries(value as Record<string, unknown>)) {
    if (!weekdays.has(day.trim().toUpperCase())) {
      errors.push(`${key} contains invalid weekday: ${day}.`);
      continue;
    }
    if (window === null || window === undefined) continue;
    if (typeof window !== 'object' || Array.isArray(window)) {
      errors.push(`${key}.${day} must be an object with start/end.`);
      continue;
    }
    const { start, end } = window as Record<string, unknown>;
    if (typeof start !== 'string' || !timeOfDayPattern.test(start)) {
      errors.push(`${key}.${day}.start must be a valid HH:mm time.`);
    }
    if (typeof end !== 'string' || !timeOfDayPattern.test(end)) {
      errors.push(`${key}.${day}.end must be a valid HH:mm time.`);
    }
  }
};

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

  validateWeeklyHours(result.parsed[WORKING_HOURS_KEY], WORKING_HOURS_KEY, errors);
  validateWeeklyHours(result.parsed[SLEEP_HOURS_KEY], SLEEP_HOURS_KEY, errors);

  const habitReminderStyle = result.parsed[HABIT_REMINDER_STYLE_KEY];
  if (habitReminderStyle !== undefined && !isHabitReminderStyle(habitReminderStyle)) {
    errors.push(`${HABIT_REMINDER_STYLE_KEY} must be one of ${HABIT_REMINDER_STYLES.join(', ')}.`);
  }

  return { parsed: result.parsed, errors };
}
