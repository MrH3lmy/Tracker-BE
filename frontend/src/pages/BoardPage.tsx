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
import {
  MAX_COLUMN_WIDTH_PX,
  buildColumnModels,
  fitsAllColumns,
  fittedColumnWidth,
  resolveDrop,
  summariseBoard,
} from '../components/board/boardUtils';
import { useElementWidth } from '../components/board/useElementWidth';
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

/**
 * Fallback for deciding the layout before the board can be measured (and in
 * test environments that do not lay out). Once a real width is available it
 * wins, because whether every column fits depends on how many there are.
 */
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
  const canProbablyFitColumns = useMediaQuery(MULTI_COLUMN_QUERY);
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const [availableWidth, measureBoard] = useElementWidth<HTMLDivElement>();
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  /*
    `deep-linking`: "URLs should reflect current state for sharing. Do: update
    URL on state/view changes. Don't: static URLs for dynamic content." The
    focus filter and the mobile column selection previously lived only in
    `useState`, so a filtered board could not be bookmarked or shared.

    The two pieces of state get *different* history treatment, because they are
    different kinds of change (`back-button`: "users expect back to work
    predictably"):

      - The focus filter REPLACES the current entry. It is a filter on one view,
        and toggling a three-way segmented control should not bury the page the
        user arrived from under three history entries.
      - The mobile column selection PUSHES a new entry. Below `md` it is the
        board's primary navigation -- picking a column is moving to a different
        view of the board -- so Back must return to the column you came from,
        which on Android is the system back gesture.
  */
  const [searchParams, setSearchParams] = useSearchParams();
  const focusParam = searchParams.get('focus');
  const focus: Focus = isFocus(focusParam) ? focusParam : 'all';

  const updateParams = (mutate: (params: URLSearchParams) => void, { replace }: { replace: boolean }) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        mutate(next);
        return next;
      },
      { replace },
    );
  };

  const setFocus = (next: Focus) =>
    updateParams(
      (params) => {
        if (next === 'all') params.delete('focus');
        else params.set('focus', next);
        // A column selected under one filter may hold nothing under the next, so
        // the column falls back to the first rather than showing a phantom
        // empty board.
        params.delete('column');
      },
      { replace: true },
    );

  const setVisibleColumnId = (columnId: number, isFirst: boolean) =>
    updateParams(
      (params) => {
        if (isFirst) params.delete('column');
        else params.set('column', String(columnId));
      },
      { replace: false },
    );

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

  /*
    Containment rule: either EVERY configured column fits inside the content
    area, or the board shows one column at a time. It never scrolls sideways and
    never leaves a partial column peeking off the edge, at any width.

    That decision cannot be a CSS breakpoint, because it depends on how many
    columns the backend configured -- three fit where five do not. So the board
    measures itself and divides. Until it can be measured (first paint, or a
    test environment that does not lay out), the `md` breakpoint stands in.
  */
  const showAllColumns =
    availableWidth === null ? canProbablyFitColumns : fitsAllColumns(availableWidth, columns.length);
  const columnWidth =
    availableWidth === null ? MAX_COLUMN_WIDTH_PX : fittedColumnWidth(availableWidth, Math.max(columns.length, 1));

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
    // Movement semantics live in `resolveDrop` so they are unit-testable
    // without a pointer; this handler only decides whether to commit.
    const drop = resolveDrop(event.active.id, event.over?.id, tasks, tasksByColumn);
    if (!drop) return;
    commitMove(drop.task, drop.targetColumnId, drop.targetIndex);
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
              The column switcher. Rendered whenever the board is in
              single-column mode, at ANY width -- a wide viewport with many
              configured columns lands here too, and without the switcher there
              would be no way to reach the other columns at all.

              Sticky, so column context is never lost mid-scroll, and each entry
              carries its own blocked count so the user can see which column
              needs attention without visiting it.
            */
            <nav
              aria-label="Board column"
              className="sticky top-(--shell-topbar-h) z-(--z-sticky) shrink-0 border-b border-line bg-canvas px-4 pb-2 sm:px-6"
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
              The padding wrapper. The measured element sits inside it with no
              padding and no width cap of its own, so what it reports is the
              true available width and capping the grid cannot feed back into
              the measurement.
            */}
            <div className="min-h-0 flex-1 px-1 sm:px-3">
              <div ref={measureBoard} className="flex h-full min-h-0 flex-col">
                {/*
                  Every column is a track of one grid, each `minmax(0, 1fr)` so
                  they share the width evenly and none can push the page wider
                  than it is. There is no horizontal scroll and no peek: when
                  they stop fitting, `showAllColumns` turns this into the
                  single-column board instead.
                */}
                <div
                  className={cn('grid h-full min-h-0', !showAllColumns && 'w-full')}
                  style={{
                    gridTemplateColumns: `repeat(${Math.max(visibleModels.length, 1)}, minmax(0, 1fr))`,
                    // Keeps a two- or three-column board from stretching into
                    // very wide lists on a large screen.
                    maxWidth: showAllColumns ? Math.max(visibleModels.length, 1) * MAX_COLUMN_WIDTH_PX : undefined,
                  }}
                >
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
              </div>
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
                <div className="cursor-grabbing" style={{ width: columnWidth }}>
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
