import type { TaskRecord } from '../tasks/taskTypes';

export const DECISION_ACTIONS = ['RESCHEDULE', 'ARCHIVE', 'DELETE', 'COMPLETE'] as const;
export type DecisionAction = (typeof DECISION_ACTIONS)[number];

export interface HabitPerformanceRecord {
  habitId: number;
  title: string;
  checkIns: number;
  target: number;
  percent: number;
}

export interface ProjectAtRiskRecord {
  projectId: number;
  name: string;
  riskLevel: string;
  riskReason: string;
  progressPercent: number;
}

export interface WeeklyReviewDraftRecord {
  weekStartDate: string;
  weekEndDate: string;
  completedTasks: TaskRecord[];
  overdueTasks: TaskRecord[];
  blockedOrWaitingTasks: TaskRecord[];
  habitPerformance: HabitPerformanceRecord[];
  projectsAtRisk: ProjectAtRiskRecord[];
  staleTasks: TaskRecord[];
}

export interface WeeklyReviewRecord {
  id: number;
  weekStartDate: string;
  completedAt: string;
  summary?: string;
  linkedNoteId?: number;
  createdDate?: string;
}

export interface TaskDecisionPayload {
  taskId: number;
  action: DecisionAction;
  newDueDate?: string;
}

export interface CompleteWeeklyReviewPayload {
  weekStartDate: string;
  summary?: string;
  linkedNoteId?: number;
  decisions?: TaskDecisionPayload[];
}
