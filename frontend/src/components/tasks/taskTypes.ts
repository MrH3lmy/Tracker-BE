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
