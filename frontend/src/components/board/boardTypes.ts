import type { TaskStatus } from '../../validation/taskStatus';
import type { TaskRecord } from '../tasks/taskTypes';

export interface BoardColumnRecord {
  id: number;
  name: string;
  status?: TaskStatus;
  position: number;
}

/** Backend-reported readiness totals for one column. Never derived client-side. */
export interface BoardColumnCounts {
  total: number;
  blocked: number;
  ready: number;
  overdue: number;
}

/** A board column plus the tasks in it and their readiness composition. */
export interface BoardColumnModel {
  column: BoardColumnRecord;
  tasks: TaskRecord[];
  counts: BoardColumnCounts;
}

/** The board's one atomic status sentence (`contextual-live-badge-updates`). */
export interface BoardSummary {
  total: number;
  blocked: number;
  text: string;
}
