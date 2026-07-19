import { addDays, startOfWeek, toDateKey } from './habitPresentation';
import type { HabitRecord } from './habitTypes';

const MS_PER_DAY = 86_400_000;
const WEEKDAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;

const toUtcDay = (date: Date): number => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY;

/** Best-effort recurrence check: is this habit scheduled to happen on `date`? Mirrors backend RecurrenceMath closely enough for analysis purposes (not a source of truth for due dates). */
export function isHabitDueOn(habit: HabitRecord, date: Date): boolean {
  const created = habit.createdDate ? new Date(habit.createdDate) : undefined;
  if (created && toUtcDay(date) < toUtcDay(created)) return false;

  const recurrence = habit.recurrence;
  if (!recurrence || !recurrence.frequency) return true;
  const interval = Math.max(1, recurrence.interval ?? 1);

  switch (recurrence.frequency) {
    case 'DAILY': {
      if (!created) return true;
      const diff = toUtcDay(date) - toUtcDay(created);
      return diff % interval === 0;
    }
    case 'WEEKLY': {
      const days = recurrence.daysOfWeek ?? [];
      if (days.length === 0 || !days.includes(WEEKDAY_NAMES[date.getDay()])) return false;
      if (!created) return true;
      const weeksDiff = (toUtcDay(startOfWeek(date)) - toUtcDay(startOfWeek(created))) / 7;
      return weeksDiff % interval === 0;
    }
    case 'MONTHLY': {
      if (!recurrence.dayOfMonth) return false;
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      if (date.getDate() !== Math.min(recurrence.dayOfMonth, daysInMonth)) return false;
      if (!created) return true;
      const monthsDiff = (date.getFullYear() - created.getFullYear()) * 12 + (date.getMonth() - created.getMonth());
      return monthsDiff % interval === 0;
    }
    case 'YEARLY': {
      const match = recurrence.annualDate?.match(/^--(\d{2})-(\d{2})$/);
      if (!match) return false;
      const month = Number(match[1]) - 1;
      const daysInMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
      const day = Math.min(Number(match[2]), daysInMonth);
      return date.getMonth() === month && date.getDate() === day;
    }
    default:
      return true;
  }
}

/** Trailing `weekCount` full weeks (Monday-first), ending with the current week. weeks[w][0..6] = Mon..Sun. */
export function getHeatmapWeeks(weekCount: number, reference: Date = new Date()): Date[][] {
  const currentWeekStart = startOfWeek(reference);
  const firstWeekStart = addDays(currentWeekStart, -(weekCount - 1) * 7);
  return Array.from({ length: weekCount }, (_, week) => {
    const weekStart = addDays(firstWeekStart, week * 7);
    return Array.from({ length: 7 }, (_, day) => addDays(weekStart, day));
  });
}

export type HabitTrend = 'up' | 'down' | 'flat' | 'new';

export interface HabitAnalysisStats {
  habitId: number;
  dueDays: number;
  metDays: number;
  completionRate: number;
  totalCheckIns: number;
  trend: HabitTrend;
}

const TREND_THRESHOLD = 0.05;

export function computeHabitStats(habit: HabitRecord, historyByHabit: Map<number, Map<string, number>>, rangeDates: Date[]): HabitAnalysisStats {
  const perDay = historyByHabit.get(habit.id);
  const target = habit.dailyTargetCount ?? 1;
  const midpoint = Math.floor(rangeDates.length / 2);

  let dueDays = 0;
  let metDays = 0;
  let totalCheckIns = 0;
  let firstHalfDue = 0;
  let firstHalfMet = 0;
  let secondHalfDue = 0;
  let secondHalfMet = 0;

  rangeDates.forEach((date, index) => {
    if (date.getTime() > Date.now() || !isHabitDueOn(habit, date)) return;
    const count = perDay?.get(toDateKey(date)) ?? 0;
    const met = count >= target;
    dueDays += 1;
    totalCheckIns += count;
    if (met) metDays += 1;
    if (index < midpoint) {
      firstHalfDue += 1;
      if (met) firstHalfMet += 1;
    } else {
      secondHalfDue += 1;
      if (met) secondHalfMet += 1;
    }
  });

  const firstRate = firstHalfDue > 0 ? firstHalfMet / firstHalfDue : undefined;
  const secondRate = secondHalfDue > 0 ? secondHalfMet / secondHalfDue : undefined;
  let trend: HabitTrend = 'flat';
  if (firstRate === undefined) {
    trend = secondRate !== undefined ? 'new' : 'flat';
  } else if (secondRate !== undefined) {
    const delta = secondRate - firstRate;
    trend = delta > TREND_THRESHOLD ? 'up' : delta < -TREND_THRESHOLD ? 'down' : 'flat';
  }

  return {
    habitId: habit.id,
    dueDays,
    metDays,
    completionRate: dueDays > 0 ? (metDays / dueDays) * 100 : 0,
    totalCheckIns,
    trend,
  };
}

export interface DayCompletion {
  date: Date;
  dueCount: number;
  metCount: number;
  checkIns: number;
}

export function computeDayCompletion(habits: HabitRecord[], historyByHabit: Map<number, Map<string, number>>, date: Date): DayCompletion {
  const dateKey = toDateKey(date);
  let dueCount = 0;
  let metCount = 0;
  let checkIns = 0;
  for (const habit of habits) {
    if (!isHabitDueOn(habit, date)) continue;
    dueCount += 1;
    const count = historyByHabit.get(habit.id)?.get(dateKey) ?? 0;
    checkIns += count;
    if (count >= (habit.dailyTargetCount ?? 1)) metCount += 1;
  }
  return { date, dueCount, metCount, checkIns };
}

/** 0 = nothing scheduled/no data, 1-5 = increasing completion intensity. */
export function heatmapLevel(day: DayCompletion): number {
  if (day.dueCount === 0) return 0;
  const rate = day.metCount / day.dueCount;
  if (rate >= 1) return 5;
  if (rate >= 0.75) return 4;
  if (rate >= 0.5) return 3;
  if (rate > 0) return 2;
  return 1;
}
