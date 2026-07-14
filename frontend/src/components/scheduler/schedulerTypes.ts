import type { TaskRecord } from '../tasks/taskTypes';

export type SchedulePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const SCHEDULE_PRIORITY_VALUES: readonly SchedulePriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export interface ScheduledTaskRecord {
  taskId: number;
  task: TaskRecord;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  priorityLevel: SchedulePriority;
  overlapsWithTaskIds: number[];
}

export interface DayScheduleRecord {
  date: string;
  scheduled: ScheduledTaskRecord[];
  unscheduled: TaskRecord[];
}

export interface ScheduleTaskPayload {
  scheduledDate: string;
  startTime: string;
  durationMinutes?: number;
  priorityLevel?: SchedulePriority;
}
