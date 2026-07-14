export const RECURRENCE_FREQUENCY_VALUES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;

export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCY_VALUES)[number];

export function isRecurrenceFrequency(value: string): value is RecurrenceFrequency {
  return RECURRENCE_FREQUENCY_VALUES.includes(value as RecurrenceFrequency);
}

export const DAY_OF_WEEK_VALUES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

export type DayOfWeekValue = (typeof DAY_OF_WEEK_VALUES)[number];

export function isDayOfWeek(value: string): value is DayOfWeekValue {
  return DAY_OF_WEEK_VALUES.includes(value as DayOfWeekValue);
}
