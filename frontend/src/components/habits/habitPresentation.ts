import type { HabitCategory, HabitGoalType, HabitHistoryEntry, HabitRecord, HabitUnitOption } from './habitTypes';
import { HABIT_UNIT_OPTIONS } from './habitTypes';

export const HABIT_CATEGORY_LABELS: Record<HabitCategory, string> = {
  WORK: 'Work',
  STUDY: 'Study',
  PERSONAL: 'Personal',
  HEALTH: 'Health',
  FAMILY: 'Family',
};

export const inferHabitIcon = (title: string, area?: string): string => {
  const t = title.toLowerCase();
  if (t.includes('water') || t.includes('drink')) return '💧';
  if (t.includes('train') || t.includes('gym') || t.includes('lift') || t.includes('workout')) return '🏋️';
  if (t.includes('run') || t.includes('exercise') || t.includes('walk') || t.includes('jog')) return '🏃';
  if (t.includes('read') || t.includes('book')) return '📖';
  if (t.includes('meditat') || t.includes('mind') || t.includes('breath')) return '🧘';
  if (t.includes('sleep')) return '😴';
  if (t.includes('teeth') || t.includes('brush')) return '🦷';
  if (t.includes('journal') || t.includes('write')) return '📝';
  switch (area) {
    case 'HEALTH': return '💪';
    case 'WORK': return '💼';
    case 'STUDY': return '📚';
    case 'FAMILY': return '👪';
    default: return '✨';
  }
};

export const inferHabitUnit = (title: string): HabitUnitOption => {
  const t = title.toLowerCase();
  if (t.includes('water') || t.includes('drink') || t.includes('glass')) return HABIT_UNIT_OPTIONS[1];
  if (t.includes('read') || t.includes('page') || t.includes('book')) return HABIT_UNIT_OPTIONS[2];
  if (t.includes('run') || t.includes('walk') || t.includes('km') || t.includes('kilomet')) return HABIT_UNIT_OPTIONS[4];
  if (t.includes('minute') || t.includes('meditat')) return HABIT_UNIT_OPTIONS[3];
  return HABIT_UNIT_OPTIONS[0];
};

export const findUnitOption = (value?: string): HabitUnitOption => HABIT_UNIT_OPTIONS.find((option) => option.value === value) ?? HABIT_UNIT_OPTIONS[0];

/** Derives a frontend-only goal type from the two real backend fields. */
export const deriveGoalType = (habit: Pick<HabitRecord, 'dailyTargetCount' | 'estimatedMinutes'>): HabitGoalType => {
  if ((habit.dailyTargetCount ?? 1) > 1) return 'COUNT';
  if (habit.estimatedMinutes) return 'DURATION';
  return 'COMPLETE_ONCE';
};

export const isCountBasedHabit = (habit: Pick<HabitRecord, 'dailyTargetCount'>) => (habit.dailyTargetCount ?? 1) > 1;

export const formatReminderTime = (value?: string): string | undefined => {
  if (!value) return undefined;
  const [hourStr, minuteStr] = value.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
};

export const WEEKDAY_SHORT_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const startOfWeek = (reference: Date): Date => {
  const date = new Date(reference);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const addDays = (date: Date, amount: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

export const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getWeekDates = (reference: Date = new Date()): Date[] => {
  const monday = startOfWeek(reference);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
};

/** habitId -> dateKey -> check-in count, built from the flat history response. */
export const buildHistoryMap = (entries: HabitHistoryEntry[]): Map<number, Map<string, number>> => {
  const map = new Map<number, Map<string, number>>();
  for (const entry of entries) {
    if (!map.has(entry.habitId)) map.set(entry.habitId, new Map());
    map.get(entry.habitId)!.set(entry.date, entry.count);
  }
  return map;
};
