import type { TaskRecord } from '../tasks/taskTypes';
import { isOverdue } from '../tasks/taskUtils';
import type { BoardColumnRecord, BoardColumnModel, BoardSummary } from './boardTypes';

/**
 * Readiness counts for one column.
 *
 * `blocked` and `ready` are summed straight from the backend flags. Neither is
 * ever derived from the other -- a task can be `blocked` and `ready:false`,
 * `ready:true` and not blocked, or neither, and the board reports exactly what
 * the API said (design-system/tracker-v2/pages/board.md section 7).
 */
export function columnCounts(tasks: TaskRecord[]) {
  let blocked = 0;
  let ready = 0;
  let overdue = 0;
  for (const task of tasks) {
    if (task.blocked) blocked += 1;
    if (task.ready) ready += 1;
    if (isOverdue(task)) overdue += 1;
  }
  return { total: tasks.length, blocked, ready, overdue };
}

/** Builds the column models the board renders, in backend column order. */
export function buildColumnModels(columns: BoardColumnRecord[], tasksByColumn: Map<number, TaskRecord[]>): BoardColumnModel[] {
  return columns.map((column) => {
    const tasks = tasksByColumn.get(column.id) ?? [];
    return { column, tasks, counts: columnCounts(tasks) };
  });
}

/**
 * The board's single atomic status sentence.
 *
 * `contextual-live-badge-updates`: "Use one appropriate atomic status message
 * such as 3 items in cart. Don't announce a bare number or make every badge a
 * competing live region." The previous board gave every empty column its own
 * `role="status"`, so a board with three empty columns announced three competing
 * statuses. This is now the only live region the board owns.
 */
export function summariseBoard(columnModels: BoardColumnModel[]): BoardSummary {
  let total = 0;
  let blocked = 0;
  for (const model of columnModels) {
    total += model.counts.total;
    blocked += model.counts.blocked;
  }
  const taskLabel = `${total} ${total === 1 ? 'task' : 'tasks'}`;
  return {
    total,
    blocked,
    text: blocked > 0 ? `${taskLabel}, ${blocked} blocked` : taskLabel,
  };
}

/**
 * Width of the column header's blocked segment, as a percentage.
 *
 * The load bar is a second, pre-attentive channel for "which column is stuck"
 * (`product` -> Drill-Down Analytics). It is never the only channel: the header
 * also prints the blocked count in words whenever it is non-zero
 * (`color-not-only`).
 */
export function blockedShare(counts: { total: number; blocked: number }): number {
  if (counts.total === 0 || counts.blocked === 0) return 0;
  return Math.round((counts.blocked / counts.total) * 100);
}
