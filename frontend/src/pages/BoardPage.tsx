import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { isQueryError } from '../apiClient';
import { useAnnouncement } from '../announcementContext';
import { BoardColumn } from '../components/board/BoardColumn';
import { BoardCardShell } from '../components/board/BoardCard';
import { BoardSkeleton } from '../components/board/BoardSkeleton';
import type { BoardColumnRecord } from '../components/board/boardTypes';
import { buildColumnModels, summariseBoard } from '../components/board/boardUtils';
import type { TaskRecord } from '../components/tasks/taskTypes';
import { sortTasksForBoard } from '../components/tasks/taskUtils';
import { matchesFocus, type Focus } from '../components/scheduler/schedulerStyleUtils';
import { useBoardColumnsQuery, useTaskMutations, useTasksQuery } from '../hooks/useApiQueries';
import { Button, EmptyState, SegmentedControl, cn } from '../components/ui';
import { Columns3, RefreshCw } from '../components/ui/icons';
import { useUndoToast } from '../undoToastContext';
import { SectionTabs } from '../components/SectionTabs';
import { TASK_VIEW_TABS } from '../router/routes';
import { useMediaQuery } from '../components/shell/useMediaQuery';

const focusOptions = [
  { value: 'all' as Focus, label: 'All' },
  { value: 'work' as Focus, label: 'Work' },
  { value: 'training' as Focus, label: 'Training & Life' },
];

/** Below this the board shows one column at a time (`gesture-conflicts`). */
const MULTI_COLUMN_QUERY = '(min-width: 768px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const isFocus = (value: string | null): value is Focus =>
  value === 'all' || value === 'work' || value === 'training';

/**
 * The Kanban board.
 *
 * Design: `design-system/tracker-v2/pages/board.md` ("Ruled Board").
 * Research: `design-system/tracker-v2/research/board-kanban/`.
 *
 * The board is a ruled instrument rather than a page of cards: full-bleed and
 * viewport-height on desktop, with the column rail scrolling horizontally, each
 * column body scrolling vertically, column headers staying put, and the page not
 * scrolling at all (`Data-Dense Dashboard`: "overflow: auto", "sticky headers";
 * `horizontal-scroll`: the region scrolls, never the page).
 *
 * Backend truth is untouched: `task.blocked`, `task.ready` and `task.blockers[]`
 * are rendered and aggregated exactly as the API reports them. Neither axis is
 * ever derived from the other.
 */
export function BoardPage() {
  const columnsQuery = useBoardColumnsQuery();
  const tasksQuery = useTasksQuery('active');
  const { moveTask } = useTaskMutations();
  const { showUndo } = useUndoToast();
  const { announce } = useAnnouncement();
  const showAllColumns = useMediaQuery(MULTI_COLUMN_QUERY);
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  /*
    `deep-linking`: "URLs should reflect current state for sharing. Do: update
    URL on state/view changes. Don't: static URLs for dynamic content." The
    focus filter and the mobile column selection previously lived only in
    `useState`, so a filtered board could not be bookmarked, shared, or stepped
    back out of. Written with `replace` so filtering does not stack history.
  */
  const [searchParams, setSearchParams] = useSearchParams();
  const focusParam = searchParams.get('focus');
  const focus: Focus = isFocus(focusParam) ? focusParam : 'all';

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        mutate(next);
        return next;
      },
      { replace: true },
    );
  };

  const setFocus = (next: Focus) =>
    updateParams((params) => {
      if (next === 'all') params.delete('focus');
      else params.set('focus', next);
      // A column selected under one filter may hold nothing under the next, so the
      // column falls back to the first rather than showing a phantom empty board.
      params.delete('column');
    });

  const setVisibleColumnId = (columnId: number, isFirst: boolean) =>
    updateParams((params) => {
      if (isFirst) params.delete('column');
      else params.set('column', String(columnId));
    });

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

  const columnModels = useMemo(() => buildColumnModels(columns, tasksByColumn), [columns, tasksByColumn]);
  const summary = useMemo(() => summariseBoard(columnModels), [columnModels]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const isLoading = columnsQuery.isLoading || tasksQuery.isLoading;
  const hasError = isQueryError(columnsQuery.data) || isQueryError(tasksQuery.data);
  const hasData = columns.length > 0;

  const columnIdParam = Number(searchParams.get('column'));
  const activeModel = columnModels.find((model) => model.column.id === columnIdParam) ?? columnModels[0];
  const activeTask = activeTaskId == null ? undefined : tasks.find((task) => task.id === activeTaskId);
  const visibleModels = showAllColumns ? columnModels : activeModel ? [activeModel] : [];

  /**
   * The one place a move is performed, whether it came from the move menu or
   * from a drag. Both paths get the same optimistic mutation, the same
   * announcement and the same undo, so the menu is a first-class mechanism
   * rather than a fallback (`dragging-alternative`, WCAG 2.2 AA).
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

  const handleDragStart = (event: DragStartEvent) => setActiveTaskId(Number(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null);
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
    <div
      className={cn(
        'flex flex-col',
        // The board owns the viewport on desktop: it is the scroll host, the
        // page is not. Below `md` the page scrolls vertically as usual.
        'md:h-[calc(100dvh-var(--shell-topbar-h))] md:overflow-hidden',
      )}
    >
      <div className="flex shrink-0 flex-col gap-3 px-4 pt-4 pb-3 sm:px-6">
        <SectionTabs items={TASK_VIEW_TABS} ariaLabel="Task view" />

        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-fg">Board</h1>
            {/*
              `contextual-live-badge-updates`: one atomic status message for the
              whole board, named so it is distinguishable from the shell's own
              announcements. This replaces the per-column `role="status"` regions
              the previous board rendered, which competed with each other.
            */}
            <p
              className="mt-0.5 text-sm text-fg-muted"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label="Board contents"
            >
              {/*
                One region, one sentence, whatever the board is doing -- loading
                included, so a screen reader never has two board statuses talking
                over each other.
              */}
              {isLoading
                ? 'Loading the board.'
                : hasError
                  ? 'The board could not be loaded.'
                  : hasData
                    ? summary.text
                    : 'Move work across columns.'}
            </p>
          </div>
          <SegmentedControl value={focus} onValueChange={setFocus} options={focusOptions} aria-label="Focus filter" />
        </div>
      </div>

      {isLoading && (
        <div className="flex min-h-0 flex-1 flex-col px-1 sm:px-3" aria-busy="true">
          <BoardSkeleton />
        </div>
      )}

      {!isLoading && hasError && (
        <div className="px-4 pb-6 sm:px-6">
          <EmptyState
            icon={RefreshCw}
            title="The board could not be loaded"
            description="The task or column request failed. Retry, or reload the page if it keeps failing."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  void columnsQuery.refetch();
                  void tasksQuery.refetch();
                }}
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                Retry
              </Button>
            }
          />
        </div>
      )}

      {!isLoading && !hasError && !hasData && (
        <div className="px-4 pb-6 sm:px-6">
          <EmptyState
            icon={Columns3}
            title="No columns configured"
            description="This board has no columns yet, so there is nowhere to place work. Add board columns to start using it."
          />
        </div>
      )}

      {!isLoading && !hasError && hasData && (
        <>
          {!showAllColumns && activeModel && (
            /*
              The mobile column switcher. Sticky, so column context is never lost
              mid-scroll, and each entry carries its own blocked count so the
              user can see which column needs attention without visiting it.
            */
            <nav
              aria-label="Board column"
              className="sticky top-(--shell-topbar-h) z-(--z-sticky) shrink-0 border-b border-line bg-canvas px-4 pb-2 sm:px-6 md:hidden"
            >
              <ul className="flex gap-1.5 overflow-x-auto pb-1">
                {columnModels.map((model, index) => {
                  const isActive = model.column.id === activeModel.column.id;
                  return (
                    <li key={model.column.id}>
                      <button
                        type="button"
                        onClick={() => setVisibleColumnId(model.column.id, index === 0)}
                        aria-current={isActive ? 'true' : undefined}
                        className={cn(
                          'flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm whitespace-nowrap',
                          'transition-colors duration-(--duration-fast)',
                          isActive
                            ? 'border-brand bg-brand-soft font-semibold text-brand'
                            : 'border-line-control font-medium text-fg-muted hover:bg-inset hover:text-fg',
                        )}
                      >
                        {model.column.name}
                        <span className="text-xs tabular-nums" data-numeric>
                          {model.counts.total}
                        </span>
                        {/* `color-not-only`: the caution tint is always backed by the word. */}
                        {model.counts.blocked > 0 && (
                          <span className="rounded-full bg-caution-soft px-1.5 text-[11px] font-semibold text-caution">
                            <span data-numeric>{model.counts.blocked}</span> blocked
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveTaskId(null)}
          >
            {/*
              The column rail. `horizontal-scroll`: wide content scrolls inside its
              own region, never the page.
            */}
            <div className="flex min-h-0 flex-1 flex-col px-1 sm:px-3 md:flex-row md:overflow-x-auto md:overscroll-x-contain">
              {visibleModels.map((model) => (
                <BoardColumn
                  key={model.column.id}
                  model={model}
                  columns={columns}
                  busy={moveTask.isPending}
                  dragActive={activeTaskId != null}
                  onMove={handleMenuMove}
                  fullWidth={!showAllColumns}
                />
              ))}
            </div>

            {/*
              The lifted card genuinely floats above the board, so it is the one
              board surface that gets a shadow (MASTER.md section 6). Under
              `prefers-reduced-motion` the drop animation is dropped entirely --
              dnd-kit animates through the Web Animations API, which the global
              CSS reduced-motion collapse does not reach.
            */}
            <DragOverlay dropAnimation={prefersReducedMotion ? null : undefined}>
              {activeTask ? (
                <div className="w-[17.5rem] cursor-grabbing">
                  <BoardCardShell task={activeTask} columns={columns} onMove={() => {}} elevated />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      )}
    </div>
  );
}
