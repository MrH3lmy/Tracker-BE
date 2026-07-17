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
  reminderEnabled?: boolean;
  reminderTime?: string;
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
  reminderEnabled: boolean;
  reminderTime?: string;
  recurrence: HabitRecurrencePayload;
}

export const HABIT_CATEGORY_VALUES = ['WORK', 'STUDY', 'PERSONAL', 'HEALTH', 'FAMILY'] as const;
export type HabitCategory = (typeof HABIT_CATEGORY_VALUES)[number];

export const HABIT_SORT_VALUES = ['reminderTime', 'name', 'currentStreak', 'recentlyCreated'] as const;
export type HabitSortValue = (typeof HABIT_SORT_VALUES)[number];

export const HABIT_SORT_LABELS: Record<HabitSortValue, string> = {
  reminderTime: 'Reminder time',
  name: 'Name',
  currentStreak: 'Current streak',
  recentlyCreated: 'Recently created',
};

/**
 * Not a backend field - the domain model only has dailyTargetCount and
 * estimatedMinutes. Goal type is a frontend-only lens over those two fields
 * so the form can show the right inputs; it's derived on load and collapsed
 * back down to dailyTargetCount/estimatedMinutes on submit.
 */
export const HABIT_GOAL_TYPE_VALUES = ['COMPLETE_ONCE', 'COUNT', 'DURATION'] as const;
export type HabitGoalType = (typeof HABIT_GOAL_TYPE_VALUES)[number];

export interface HabitUnitOption {
  value: string;
  label: string;
  singular: string;
}

export const HABIT_UNIT_OPTIONS: HabitUnitOption[] = [
  { value: 'times', label: 'Times', singular: 'time' },
  { value: 'glasses', label: 'Glasses', singular: 'glass' },
  { value: 'pages', label: 'Pages', singular: 'page' },
  { value: 'minutes', label: 'Minutes', singular: 'minute' },
  { value: 'kilometers', label: 'Kilometers', singular: 'kilometer' },
];

export interface HabitPreset {
  label: string;
  icon: string;
  title: string;
  description?: string;
  area?: HabitCategory;
  estimatedMinutes?: number;
  dailyTargetCount?: number;
  goalType: HabitGoalType;
  unit?: string;
}

export const HABIT_PRESETS: HabitPreset[] = [
  { label: 'Training', icon: '🏋️', title: 'Training', description: '30 minutes strength or skill session', area: 'HEALTH', goalType: 'COMPLETE_ONCE' },
  { label: 'Drink water', icon: '💧', title: 'Drink water', description: '8 glasses of water', area: 'HEALTH', dailyTargetCount: 8, goalType: 'COUNT', unit: 'glasses' },
  { label: 'Exercise', icon: '🏃', title: 'Exercise', description: '30 minutes of physical activity', area: 'HEALTH', goalType: 'COMPLETE_ONCE' },
  { label: 'Read', icon: '📖', title: 'Read', description: 'Read a few pages', area: 'PERSONAL', dailyTargetCount: 10, goalType: 'COUNT', unit: 'pages' },
  { label: 'Brush teeth', icon: '🦷', title: 'Brush teeth', area: 'HEALTH', dailyTargetCount: 2, goalType: 'COUNT', unit: 'times' },
];

/** One row per (habit, day) with a check-in count > 0, from GET /api/v1/habits/history. */
export interface HabitHistoryEntry {
  habitId: number;
  date: string;
  count: number;
}
