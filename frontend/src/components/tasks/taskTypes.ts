import type { TaskStatus } from '../../validation/taskStatus';
import type { DayOfWeekValue, RecurrenceFrequency } from '../../validation/recurrence';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FilterValue = 'all' | string;
export type TaskSortValue = 'position' | 'priorityScore' | 'dueDate' | 'createdDate' | 'effort' | 'title';

export interface RecurrenceRuleRecord {
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

/**
 * One unfinished required prerequisite for a task (issue #282/#296). A dependency-graph fact
 * computed by the backend, not a copy of the dependent task's own workflow `status` field.
 */
export interface TaskBlockerRef {
  id: number;
  title: string;
  status?: TaskStatus;
}

export interface TaskRecord {
  id: number;
  title: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: string;
  startDate?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  riskLevel?: RiskLevel;
  riskReason?: string;
  track?: string;
  phase?: string;
  parentTaskId?: number;
  projectId?: number;
  createdDate?: string;
  completedDate?: string;
  important?: boolean;
  area?: string;
  effort?: string;
  blockedReason?: string;
  waitingOn?: string;
  followUpDate?: string;
  boardColumnId?: number;
  position?: number;
  dependencyIds?: number[];
  blockingTaskIds?: number[];
  overdue?: boolean;
  priorityScore?: number;
  /**
   * Dependency-derived readiness (issue #282/#296) - distinct from the manual `status` field
   * (e.g. a WAITING task can still be `ready`, and a NOT_STARTED task can be `blocked`). Never
   * conflate the two in UI: render them as visually separate chip families.
   */
  blocked?: boolean;
  ready?: boolean;
  blockers?: TaskBlockerRef[];
  subtaskIds?: number[];
  subtaskCount?: number;
  completedSubtaskCount?: number;
  subtaskProgressPercent?: number;
  noteCount?: number;
  notesCount?: number;
  recurrence?: RecurrenceRuleRecord;
}

export interface TaskTreeNode extends TaskRecord {
  subtasks: TaskTreeNode[];
}

export interface TaskDetailRecord {
  task: TaskRecord;
  notes: unknown[];
  screenshots: unknown[];
  linkedNotes: unknown[];
}

export interface DuplicateGroup {
  representative: TaskRecord;
  duplicates: TaskRecord[];
}

export interface BlockerWarning {
  type: string;
  title: string;
  taskId?: number;
  taskTitle?: string;
  status?: TaskStatus;
  priorityScore?: number;
  message: string;
  recommendation: string;
  relatedTaskIds?: number[];
}

export interface BlockerAnalysis {
  warnings: BlockerWarning[];
  dependencyCount: number;
}

/** Why a task appears in Today (issue #286/#296) - server-computed, never re-derived client-side. */
export const TODAY_REASON_VALUES = ['OVERDUE', 'DUE_TODAY', 'SCHEDULED_TODAY'] as const;
export type TodayReason = (typeof TODAY_REASON_VALUES)[number];

export interface TodayTaskRecord {
  task: TaskRecord;
  todayReason: TodayReason;
  blocked: boolean;
}

/**
 * `tasks` is pre-ordered by the backend (overdue, then due-today, then scheduled-today, priority
 * desc within each group) - the client groups this array for display, it never re-sorts it.
 */
export interface TodayResponseRecord {
  date: string;
  tasks: TodayTaskRecord[];
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  dueDate?: string;
  startDate?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  riskLevel?: RiskLevel;
  riskReason?: string;
  track?: string;
  phase?: string;
  parentTaskId?: number;
  important: boolean;
  area?: string;
  effort?: string;
  blockedReason?: string;
  waitingOn?: string;
  followUpDate?: string;
  status?: TaskStatus;
  recurrence?: RecurrenceRuleRecord;
}
