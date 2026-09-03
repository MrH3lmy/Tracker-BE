import type { TaskRecord } from './taskTypes';
import { isOverdue } from './taskUtils';

/**
 * The three mutually exclusive work states a task can be in, derived *only* from the backend's
 * `blocked` and `ready` fields (issue #282/#296/#304).
 *
 * `ready` is NEVER inferred from `!blocked`: a WAITING / BACKLOG / manually-BLOCKED task can have
 * `blocked=false` while `ready=false`, and calling that "ready" is the exact regression #297 fixed
 * on Today. `blocked` wins over `ready` so a blocked task can never be shown as actionable.
 */
export type TaskWorkState = 'ready' | 'blocked' | 'waiting';

export const taskWorkState = (task: TaskRecord): TaskWorkState => {
  if (task.blocked === true) return 'blocked';
  if (task.ready === true) return 'ready';
  return 'waiting';
};

/** Primary lens: mutually exclusive, because the three work states partition the scope exactly. */
export const TASK_LENS_VALUES = ['all', 'ready', 'blocked', 'waiting'] as const;
export type TaskLens = (typeof TASK_LENS_VALUES)[number];
export const isTaskLens = (value: string): value is TaskLens => (TASK_LENS_VALUES as readonly string[]).includes(value);

/** Secondary signals: independent toggles that compose with the lens and with each other. */
export const TASK_SIGNAL_VALUES = ['overdue', 'followUp', 'important'] as const;
export type TaskSignal = (typeof TASK_SIGNAL_VALUES)[number];
export const isTaskSignal = (value: string): value is TaskSignal => (TASK_SIGNAL_VALUES as readonly string[]).includes(value);

export const TASK_LENS_LABEL: Record<TaskLens, string> = {
  all: 'All',
  ready: 'Ready',
  blocked: 'Blocked',
  waiting: 'Waiting',
};

export const TASK_SIGNAL_LABEL: Record<TaskSignal, string> = {
  overdue: 'Overdue',
  followUp: 'Follow-up',
  important: 'Important',
};

export const WORK_STATE_LABEL: Record<TaskWorkState, string> = {
  ready: 'Ready',
  blocked: 'Blocked',
  waiting: 'Waiting',
};

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/** A follow-up is "due" once its date has arrived - a future reminder is not an attention signal. */
export const isFollowUpDue = (task: TaskRecord, now: Date = startOfToday()) => {
  if (!task.followUpDate) return false;
  const followUp = new Date(task.followUpDate);
  if (Number.isNaN(followUp.getTime())) return false;
  followUp.setHours(0, 0, 0, 0);
  return followUp.getTime() <= now.getTime();
};

export const matchesLens = (task: TaskRecord, lens: TaskLens) => lens === 'all' || taskWorkState(task) === lens;

export const matchesSignal = (task: TaskRecord, signal: TaskSignal, now?: Date) => {
  if (signal === 'overdue') return isOverdue(task);
  if (signal === 'important') return Boolean(task.important);
  return isFollowUpDue(task, now);
};

export type TaskLensCounts = Record<TaskLens, number>;
export type TaskSignalCounts = Record<TaskSignal, number>;

/**
 * Counts are always taken over a *whole* scope (the full Active / Done / Archived array the
 * scope's single query returned) and never over a filtered or paginated slice - issue #304's
 * "do not invent global counts from incomplete datasets".
 */
export const countTaskLenses = (tasks: TaskRecord[]): TaskLensCounts => {
  const counts: TaskLensCounts = { all: tasks.length, ready: 0, blocked: 0, waiting: 0 };
  tasks.forEach((task) => { counts[taskWorkState(task)] += 1; });
  return counts;
};

export const countTaskSignals = (tasks: TaskRecord[], now?: Date): TaskSignalCounts => {
  const counts: TaskSignalCounts = { overdue: 0, followUp: 0, important: 0 };
  tasks.forEach((task) => {
    if (isOverdue(task)) counts.overdue += 1;
    if (isFollowUpDue(task, now)) counts.followUp += 1;
    if (task.important) counts.important += 1;
  });
  return counts;
};
