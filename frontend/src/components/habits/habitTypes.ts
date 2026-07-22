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
  { value: 'steps', label: 'Steps', singular: 'step' },
  { value: 'servings', label: 'Servings', singular: 'serving' },
  { value: 'questions', label: 'Questions', singular: 'question' },
  { value: 'cards', label: 'Cards', singular: 'card' },
  { value: 'items', label: 'Items', singular: 'item' },
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
  // Health
  { label: 'Training', icon: '🏋️', title: 'Training', description: '30 minutes strength or skill session', area: 'HEALTH', goalType: 'COMPLETE_ONCE' },
  { label: 'Drink water', icon: '💧', title: 'Drink water', description: '8 glasses of water', area: 'HEALTH', dailyTargetCount: 8, goalType: 'COUNT', unit: 'glasses' },
  { label: 'Exercise', icon: '🏃', title: 'Exercise', description: '30 minutes of physical activity', area: 'HEALTH', goalType: 'COMPLETE_ONCE' },
  { label: 'Brush teeth', icon: '🦷', title: 'Brush teeth', area: 'HEALTH', dailyTargetCount: 2, goalType: 'COUNT', unit: 'times' },
  { label: 'Meditate', icon: '🧘', title: 'Meditate', description: 'Meditate for 10 minutes', area: 'HEALTH', goalType: 'DURATION', estimatedMinutes: 10 },
  { label: 'Stretch', icon: '🤸', title: 'Stretch', description: 'Complete a short stretching session', area: 'HEALTH', goalType: 'DURATION', estimatedMinutes: 10 },
  { label: 'Walk', icon: '🚶', title: 'Walk', description: 'Walk 3 kilometers', area: 'HEALTH', dailyTargetCount: 3, goalType: 'COUNT', unit: 'kilometers' },
  { label: 'Sleep on time', icon: '😴', title: 'Sleep on time', description: 'Go to bed at the planned time', area: 'HEALTH', goalType: 'COMPLETE_ONCE' },

  // Study
  { label: 'Study', icon: '📚', title: 'Study', description: 'Complete a focused study session', area: 'STUDY', goalType: 'DURATION', estimatedMinutes: 30 },
  { label: 'Practice a language', icon: '🗣️', title: 'Practice a language', description: 'Practice a language for 15 minutes', area: 'STUDY', goalType: 'DURATION', estimatedMinutes: 15 },

  // Work
  { label: 'Deep work', icon: '🎯', title: 'Deep work', description: 'Complete one distraction-free focus session', area: 'WORK', goalType: 'DURATION', estimatedMinutes: 60 },
  { label: 'Plan the day', icon: '📋', title: 'Plan the day', description: 'Review priorities and plan the day', area: 'WORK', goalType: 'COMPLETE_ONCE' },

  // Personal
  { label: 'Read', icon: '📖', title: 'Read', description: 'Read a few pages', area: 'PERSONAL', dailyTargetCount: 10, goalType: 'COUNT', unit: 'pages' },
  { label: 'Journal', icon: '✍️', title: 'Journal', description: 'Write a short daily journal entry', area: 'PERSONAL', goalType: 'COMPLETE_ONCE' },
  { label: 'Gratitude', icon: '🙏', title: 'Gratitude', description: 'Write down 3 things you are grateful for', area: 'PERSONAL', dailyTargetCount: 3, goalType: 'COUNT', unit: 'items' },
  { label: 'Tidy up', icon: '🧹', title: 'Tidy up', description: 'Spend 10 minutes tidying your space', area: 'PERSONAL', goalType: 'DURATION', estimatedMinutes: 10 },

  // Family
  { label: 'Call family', icon: '📞', title: 'Call family', description: 'Call or check in with a family member', area: 'FAMILY', goalType: 'COMPLETE_ONCE' },
];

/** One row per (habit, day) with a check-in count > 0, from GET /api/v1/habits/history. */
export interface HabitHistoryEntry {
  habitId: number;
  date: string;
  count: number;
}
