import type { TaskRecord } from '../tasks/taskTypes';
import type { HabitRecord } from '../habits/habitTypes';

export type SchedulePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const SCHEDULE_PRIORITY_VALUES: readonly SchedulePriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export type ScheduledEntryKind = 'TASK' | 'HABIT';

export interface ScheduledEntryRecord {
  kind: ScheduledEntryKind;
  id: number;
  task?: TaskRecord;
  habit?: HabitRecord;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  priorityLevel: SchedulePriority;
  overlapsWithIds: number[];
}

export interface DayScheduleRecord {
  date: string;
  scheduled: ScheduledEntryRecord[];
  unscheduledTasks: TaskRecord[];
  unscheduledHabits: HabitRecord[];
}

export interface ScheduleTaskPayload {
  scheduledDate: string;
  startTime: string;
  durationMinutes?: number;
  priorityLevel?: SchedulePriority;
}

export type ScheduleHabitPayload = ScheduleTaskPayload;

export interface SuggestedSlotRecord {
  scheduledDate: string;
  startTime: string;
  durationMinutes: number;
}

export type AutoScheduleScope = 'ALL' | 'TASKS_ONLY' | 'HABITS_ONLY';

export interface AutoScheduleResultRecord {
  scheduledTaskIds: number[];
  scheduledHabitIds: number[];
  unresolvedTaskIds: number[];
  unresolvedHabitIds: number[];
}
