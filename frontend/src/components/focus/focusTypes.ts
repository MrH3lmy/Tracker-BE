export const FOCUS_SESSION_STATUS_VALUES = ['RUNNING', 'PAUSED', 'COMPLETED', 'ABANDONED'] as const;
export type FocusSessionStatus = (typeof FOCUS_SESSION_STATUS_VALUES)[number];

export interface FocusSessionRecord {
  id: number;
  taskId?: number;
  taskTitle?: string;
  startedAt: string;
  endedAt?: string;
  status: FocusSessionStatus;
  note?: string;
  actualMinutes?: number;
  elapsedMinutes: number;
}

export interface EstimateDivergenceRecord {
  taskId: number;
  taskTitle: string;
  estimatedMinutes: number;
  actualMinutes: number;
  divergencePercent: number;
}

export interface FocusAnalyticsRecord {
  totalMinutes: number;
  sessionCount: number;
  minutesByDay: Record<string, number>;
  minutesByArea: Record<string, number>;
  estimateDivergences: EstimateDivergenceRecord[];
  mostProductiveHour?: number;
}

export interface StopFocusSessionPayload {
  note?: string;
  completeTask?: boolean;
}
