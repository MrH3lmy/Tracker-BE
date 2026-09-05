import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '../ui';
import { Inbox } from '../ui/icons';
import { BoardCard } from './BoardCard';
import type { BoardColumnRecord, BoardColumnModel } from './boardTypes';
import { blockedShare } from './boardUtils';

export interface BoardColumnProps {
  model: BoardColumnModel;
  columns: BoardColumnRecord[];
  onMove: (taskId: number, columnId: number) => void;
  busy?: boolean;
  /** True while any card is being dragged, so drop affordances only exist during a drag. */
  dragActive?: boolean;
  /** Below `md` the board shows one column at a time, so it fills the width instead of sitting in the rail. */
  fullWidth?: boolean;
}

/**
 * One column of the board.
 *
 * A column is a *column of the board grid*, not a container: no column background,
 * no column border box. Columns share one ground and are separated by a hairline
 * rule (Minimalism & Swiss Style -- "geometric, grid-based"). That deletes a
 * whole surface level: the previous board nested canvas -> column slab -> card ->
 * blocker box, four bordered surfaces deep, which MASTER.md section 13.2 names
 * as the "card-in-card-in-card" anti-pattern.
 *
 * The header sits outside the scrolling body, so on the desktop board -- where
 * the column body is the scroll container -- it stays put without needing
 * `position: sticky` (`Data-Dense Dashboard`: "sticky headers").
 */
export function BoardColumn({
  model,
  columns,
  onMove,
  busy = false,
  dragActive = false,
  fullWidth = false,
}: BoardColumnProps) {
  const { column, tasks, counts } = model;
  const { setNodeRef, isOver } = useDroppable({ id: `column-${column.id}`, data: { columnId: column.id } });
  const share = blockedShare(counts);

  return (
    <section
      aria-label={`${column.name} column, ${counts.total} ${counts.total === 1 ? 'task' : 'tasks'}`}
      className={cn(
        'flex min-h-0 flex-col',
        // The hairline that separates one column from the next. Decorative, so it
        // uses `line`, not `line-control`.
        'md:border-l md:border-line md:first:border-l-0',
        fullWidth ? 'w-full' : 'w-full shrink-0 md:w-[17.5rem]',
      )}
    >
      {/*
        Below `md` the sticky column switcher already names the column and carries
        its count and blocked count, so repeating all three immediately beneath
        it is pure duplication. The heading stays in the document outline.
      */}
      {fullWidth ? (
        <h2 className="sr-only">{column.name}</h2>
      ) : (
        <header className="flex shrink-0 flex-col gap-1 px-3 pb-2">
          <div className="flex items-baseline gap-2">
            <h2 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-fg" title={column.name}>
              {column.name}
            </h2>
            {/*
              `content-jumping`: a stable numeric slot, so a column going from 9
              to 10 tasks does not shove the heading beside it.
            */}
            <span
              className="min-w-5 shrink-0 text-right text-[13px] font-semibold text-fg-muted tabular-nums"
              data-numeric
            >
              {counts.total}
            </span>
          </div>

          {/*
            Reserved sub-line: always present so columns stay aligned whether or
            not they hold blocked work. `color-not-only` -- the load bar below is
            never the only carrier of "this column is stuck"; this line says it
            in words.
          */}
          <p className="min-h-4 text-[11px] leading-4 font-medium text-caution">
            {counts.blocked > 0 ? `${counts.blocked} blocked` : null}
          </p>

          {/* The load bar: which column is stuck, before reading a single card. */}
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-line-strong" aria-hidden>
            {share > 0 && <div className="h-full rounded-full bg-caution" style={{ width: `${share}%` }} />}
          </div>
        </header>
      )}

      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 px-3 pt-2 pb-4',
          // The column body is the scroll container on the desktop board; below
          // `md` the page scrolls vertically instead (`gesture-conflicts`:
          // "vertical scroll primary").
          'md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain',
          'transition-colors duration-(--duration-fast)',
          // Drop affordance exists only during a drag -- a permanent tint is
          // decoration, and decoration is what P1 forbids. It reads through a
          // background change *and* an outline, never colour alone.
          dragActive && 'rounded-lg',
          dragActive && isOver && 'bg-brand-soft outline-2 outline-offset-[-2px] outline-dashed outline-brand',
        )}
      >
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <BoardCard
                key={task.id}
                task={task}
                columns={columns}
                busy={busy}
                onMove={(columnId) => onMove(task.id, columnId)}
              />
            ))
          ) : (
            /*
              A designed empty column, not a dashed grey box -- and deliberately
              *not* a live region. `contextual-live-badge-updates`: "don't make
              every badge a competing live region". The previous board gave every
              empty column its own `role="status"`, so a board with three empty
              columns announced three competing statuses. The board now has exactly
              one, in its toolbar.
            */
            <div className="flex flex-col items-center gap-1.5 px-2 py-8 text-center">
              <Inbox className="h-5 w-5 text-fg-subtle" aria-hidden />
              <p className="text-[13px] font-medium text-fg-muted">Nothing in {column.name}</p>
              <p className="max-w-[15rem] text-[11px] text-fg-subtle">
                Drag a card here, or use a task&rsquo;s move menu.
              </p>
            </div>
          )}
        </SortableContext>
      </div>
    </section>
  );
}
