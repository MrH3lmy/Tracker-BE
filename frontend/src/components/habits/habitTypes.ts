import type { DayOfWeekValue, RecurrenceFrequency } from '../../validation/recurrence';

export interface HabitRecurrenceRecord {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: DayOfWeekValue[];
  dayOfMonth?: number;
  annualDate?: string;
  nextDueDate?: string;
  lastCompletedDate?: string;
  currentStreak?: number;
  longestStreak?: number;
}

export interface HabitRecord {
  id: number;
  title: string;
  description?: string;
  area?: string;
  important?: boolean;
  estimatedMinutes?: number;
  dailyTargetCount: number;
  createdDate?: string;
  todayCheckInCount?: number;
  todayTargetMet?: boolean;
  recurrence?: HabitRecurrenceRecord;
}

export interface HabitRecurrencePayload {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: DayOfWeekValue[];
  dayOfMonth?: number;
  annualDate?: string;
}

export interface CreateHabitPayload {
  title: string;
  description?: string;
  area?: string;
  important: boolean;
  estimatedMinutes?: number;
  dailyTargetCount?: number;
  recurrence: HabitRecurrencePayload;
}
