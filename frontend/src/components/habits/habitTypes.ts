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

export interface HabitPreset {
  label: string;
  icon: string;
  title: string;
  description?: string;
  area?: string;
  estimatedMinutes?: number;
  dailyTargetCount?: number;
}

export const HABIT_PRESETS: HabitPreset[] = [
  { label: 'Exercise', icon: '🏃', title: 'Exercise', description: '30 minutes of physical activity', area: 'HEALTH', estimatedMinutes: 30 },
  { label: 'Training', icon: '🏋️', title: 'Training', description: 'Strength or skill training session', area: 'HEALTH', estimatedMinutes: 45 },
  { label: 'Brush teeth', icon: '🦷', title: 'Brush teeth', area: 'HEALTH', estimatedMinutes: 2, dailyTargetCount: 2 },
  { label: 'Drink water', icon: '💧', title: 'Drink water', description: '8 glasses of water', area: 'HEALTH', dailyTargetCount: 8 },
];
