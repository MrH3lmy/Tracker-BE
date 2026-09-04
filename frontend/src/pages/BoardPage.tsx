import { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { isQueryError } from '../apiClient';
import { useAnnouncement } from '../announcementContext';
import { QueryState } from '../components/QueryState';
import { BoardColumn } from '../components/board/BoardColumn';
import type { BoardColumnRecord } from '../components/board/boardTypes';
import type { TaskRecord } from '../components/tasks/taskTypes';
import { sortTasksForBoard } from '../components/tasks/taskUtils';
import { matchesFocus, type Focus } from '../components/scheduler/schedulerStyleUtils';
import { useBoardColumnsQuery, useTaskMutations, useTasksQuery } from '../hooks/useApiQueries';
import { SegmentedControl, cn } from '../components/ui';
import { useUndoToast } from '../undoToastContext';
import { SectionTabs } from '../components/SectionTabs';
import { TASK_VIEW_TABS } from '../router/routes';
import { useMediaQuery } from '../components/shell/useMediaQuery';

const focusOptions = [
  { value: 'all' as Focus, label: 'All' },
  { value: 'work' as Focus, label: 'Work' },
  { value: 'training' as Focus, label: 'Training & Life' },
];

/** Below this the board shows one column at a time (see `gesture-conflicts`). */
const MULTI_COLUMN_QUERY = '(min-width: 768px)';

export function BoardPage() {
  const columnsQuery = useBoardColumnsQuery();
  const tasksQuery = useTasksQuery('active');
  const { moveTask } = useTaskMutations();
  const { showUndo } = useUndoToast();
  const { announce } = useAnnouncement();
  const [focus, setFocus] = useState<Focus>('all');
  const [visibleColumnId, setVisibleColumnId] = useState<number | null>(null);
  const showAllColumns = useMediaQuery(MULTI_COLUMN_QUERY);

  const columns = useMemo<BoardColumnRecord[]>(() => {
    const data = columnsQuery.data?.data;
    return Array.isArray(data) ? (data as BoardColumnRecord[]) : [];
  }, [columnsQuery.data]);

  const tasks = useMemo<TaskRecord[]>(() => {
    const data = tasksQuery.data?.data;
    const allTasks = Array.isArray(data) ? (data as TaskRecord[]) : [];
    return allTasks.filter((task) => matchesFocus(task.area, focus));
  }, [tasksQuery.data, focus]);

  const tasksByColumn = useMemo(() => {
    const map = new Map<number, TaskRecord[]>();
    for (const column of columns) map.set(column.id, []);
    for (const task of tasks) {
      if (task.boardColumnId == null) continue;
      const bucket = map.get(task.boardColumnId);
      if (bucket) bucket.push(task);
    }
    for (const [columnId, bucket] of map) map.set(columnId, sortTasksForBoard(bucket));
    return map;
  }, [columns, tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const isLoading = columnsQuery.isLoading || tasksQuery.isLoading;
  const hasError = isQueryError(columnsQuery.data) || isQueryError(tasksQuery.data);
  const hasData = columns.length > 0;

  const activeColumnId = visibleColumnId ?? columns[0]?.id ?? null;
  const mobileColumn = columns.find((column) => column.id === activeColumnId) ?? columns[0];

  /**
   * The one place a move is performed, whether it came from the move menu or from
   * a drag. Both paths get the same optimistic mutation, the same announcement and
   * the same undo, so the menu is a first-class mechanism rather than a fallback.
   */
  const commitMove = (task: TaskRecord, targetColumnId: number, targetIndex: number) => {
    const previousColumnId = task.boardColumnId;
    const previousPosition = task.position;
    const targetName = columns.find((column) => column.id === targetColumnId)?.name ?? 'column';

    moveTask.mutate(
      { id: task.id, body: { boardColumnId: targetColumnId, position: targetIndex } },
      {
        onSuccess: (result) => {
          if (!result.ok) {
            announce(result.error?.message ?? `Could not move "${task.title}".`);
            return;
          }
          announce(`"${task.title}" moved to ${targetName}.`);
          showUndo(`"${task.title}" moved to ${targetName}.`, () =>
            moveTask.mutate({ id: task.id, body: { boardColumnId: previousColumnId, position: previousPosition } }),
          );
        },
      },
    );
  };

  /** Menu-driven move: appends to the end of the destination column. */
  const handleMenuMove = (taskId: number, targetColumnId: number) => {
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task || task.boardColumnId === targetColumnId) return;
    const targetIndex = (tasksByColumn.get(targetColumnId) ?? []).length;
    commitMove(task, targetColumnId, targetIndex);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const draggedTaskId = Number(active.id);
    const draggedTask = tasks.find((task) => task.id === draggedTaskId);
    if (!draggedTask) return;

    const overId = String(over.id);
    const targetColumnId = overId.startsWith('column-')
      ? Number(overId.replace('column-', ''))
      : tasks.find((task) => task.id === Number(overId))?.boardColumnId;
    if (targetColumnId == null) return;

    const columnTasks = (tasksByColumn.get(targetColumnId) ?? []).filter((task) => task.id !== draggedTaskId);
    const overTaskId = overId.startsWith('column-') ? undefined : Number(overId);
    const targetIndex =
      overTaskId === undefined
        ? columnTasks.length
        : Math.max(0, columnTasks.findIndex((task) => task.id === overTaskId));

    if (draggedTask.boardColumnId === targetColumnId && draggedTask.position === targetIndex) return;

    commitMove(draggedTask, targetColumnId, targetIndex);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
      <SectionTabs items={TASK_VIEW_TABS} ariaLabel="Task view" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-fg">Board</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Move work across columns. Drag a card, or use its move button for a menu.
          </p>
        </div>
        <SegmentedControl value={focus} onValueChange={setFocus} options={focusOptions} aria-label="Focus filter" />
      </div>

      <QueryState
        isLoading={isLoading}
        isError={hasError}
        isEmpty={!isLoading && !hasError && !hasData}
        emptyMessage="No board columns configured."
      />

      {hasData && !showAllColumns && mobileColumn && (
        <nav aria-label="Board column" className="flex gap-1.5 overflow-x-auto pb-1">
          {columns.map((column) => {
            const isActive = column.id === mobileColumn.id;
            return (
              <button
                key={column.id}
                type="button"
                onClick={() => setVisibleColumnId(column.id)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm whitespace-nowrap',
                  'transition-colors duration-(--duration-fast)',
                  isActive
                    ? 'border-brand bg-brand-soft font-semibold text-brand'
                    : 'border-line-control font-medium text-fg-muted hover:bg-inset hover:text-fg',
                )}
              >
                {column.name}
                <span className="text-xs tabular-nums">{(tasksByColumn.get(column.id) ?? []).length}</span>
              </button>
            );
          })}
        </nav>
      )}

      {hasData && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {showAllColumns ? (
            // The column rail scrolls, never the page (`horizontal-scroll`).
            <div className="flex gap-3 overflow-x-auto pb-2">
              {columns.map((column) => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  columns={columns}
                  tasks={tasksByColumn.get(column.id) ?? []}
                  busy={moveTask.isPending}
                  onMove={handleMenuMove}
                />
              ))}
            </div>
          ) : (
            mobileColumn && (
              <BoardColumn
                key={mobileColumn.id}
                column={mobileColumn}
                columns={columns}
                tasks={tasksByColumn.get(mobileColumn.id) ?? []}
                busy={moveTask.isPending}
                onMove={handleMenuMove}
                fullWidth
              />
            )
          )}
        </DndContext>
      )}
    </div>
  );
}
