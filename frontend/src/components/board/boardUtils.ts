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

/** A movement the board should commit: which task, to which column, at which index. */
export interface DropResolution {
  task: TaskRecord;
  targetColumnId: number;
  targetIndex: number;
}

/**
 * Resolves a finished drag into a movement, or `null` when there is nothing to do.
 *
 * Extracted from the drag handler so the movement semantics -- which column a
 * drop lands in, and at which index -- are testable without simulating a
 * pointer. jsdom gives every element a zero-size rect, so a drag driven through
 * dnd-kit's collision detection cannot be exercised there; the resolution it
 * feeds can.
 *
 * `overId` is either a column droppable (`column-<id>`) or the id of a card
 * already in a column. Dropping on a card takes that card's index, so the
 * dragged task lands where the pointer is; dropping on the column body appends.
 */
export function resolveDrop(
  activeId: string | number,
  overId: string | number | null | undefined,
  tasks: TaskRecord[],
  tasksByColumn: Map<number, TaskRecord[]>,
): DropResolution | null {
  if (overId == null) return null;

  const draggedTaskId = Number(activeId);
  const task = tasks.find((candidate) => candidate.id === draggedTaskId);
  if (!task) return null;

  const over = String(overId);
  const isColumnTarget = over.startsWith('column-');
  const targetColumnId = isColumnTarget
    ? Number(over.replace('column-', ''))
    : tasks.find((candidate) => candidate.id === Number(over))?.boardColumnId;
  if (targetColumnId == null || Number.isNaN(targetColumnId)) return null;

  const destination = tasksByColumn.get(targetColumnId) ?? [];
  const isSameColumn = task.boardColumnId === targetColumnId;
  // Dropping on a column's body means "put it at the end". Within the column it
  // already occupies, the end is `length - 1`, because the task is counted in
  // that length and is about to vacate its own slot.
  const endIndex = isSameColumn ? Math.max(0, destination.length - 1) : destination.length;

  // Indices are taken against the FULL destination list, not one with the
  // dragged task filtered out. Filtering first is what made a same-column
  // downward reorder silently resolve to the task's own position and do
  // nothing: dragging the top card onto the one below it computed index 0,
  // which is exactly where it already was.
  const overIndex = isColumnTarget ? -1 : destination.findIndex((candidate) => candidate.id === Number(over));
  const targetIndex = overIndex < 0 ? endIndex : overIndex;

  // A drop that changes nothing is not a move: it must not spend a request, an
  // announcement or an undo.
  if (isSameColumn && task.position === targetIndex) return null;

  return { task, targetColumnId, targetIndex };
}
