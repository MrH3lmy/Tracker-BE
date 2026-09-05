import { memo, type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import type { TaskRecord } from '../tasks/taskTypes';
import { formatDate, isOverdue } from '../tasks/taskUtils';
import { BlockerDisclosure } from '../tasks/BlockerDisclosure';
import { ReadinessBadge } from '../tasks/ReadinessBadge';
import { TaskMoveMenu } from '../tasks/TaskMoveMenu';
import type { BoardColumnRecord } from './boardTypes';
import { Badge, cn } from '../ui';
import { CalendarDays, Flag, Flame, GripVertical, ListChecks, Target } from '../ui/icons';

/**
 * The board card.
 *
 * Ranked in four channels rather than one row of identical pills, per
 * `compact-label-semantics` -- "badges communicate state while chips or tags
 * represent values or actions; don't make every pill clickable or encode status
 * with colour alone". See design-system/tracker-v2/pages/board.md section 2.
 *
 *   1. state spine   3px leading bar, always redundant with a word or a glyph
 *   2. identity      the task title, wrapping, linked to its detail route
 *   3. state badges  Blocked / Overdue only -- icon AND word, at most two
 *   4. value chips   due date, subtasks, streak, score -- borderless, subordinate
 */

interface CardMetaProps {
  icon: ReactNode;
  children: ReactNode;
  /** Screen-reader name for the value, since the glyph alone does not name it. */
  label: string;
}

/**
 * A rank-4 value chip. Deliberately *not* pill-shaped: `compact-label-semantics`
 * separates state badges from value chips, and shape is how that separation
 * survives greyscale.
 *
 * `compact-label-overflow`: the label stays whole on one line -- `nowrap` with a
 * shrinkable `min-w-0` body and a `shrink-0` glyph.
 */
function CardMeta({ icon, children, label }: CardMetaProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-[11px] whitespace-nowrap text-fg-subtle">
      <span className="shrink-0 text-fg-subtle" aria-hidden>
        {icon}
      </span>
      <span className="sr-only">{label}: </span>
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

/** Which state owns the leading spine. Ranked by what changes the next action. */
function spineClass(task: TaskRecord, overdue: boolean) {
  if (overdue) return 'bg-critical';
  if (task.blocked) return 'bg-caution';
  if (task.important) return 'bg-brand';
  return 'bg-line';
}

export interface BoardCardShellProps {
  task: TaskRecord;
  columns: BoardColumnRecord[];
  onMove: (columnId: number) => void;
  busy?: boolean;
  /** Drag activator, supplied by the sortable wrapper. Omitted in the drag overlay. */
  dragHandle?: ReactNode;
  /** The floating copy under the pointer: it genuinely floats, so it gets a shadow. */
  elevated?: boolean;
  /** The gap the lifted card left behind. */
  placeholder?: boolean;
}

/**
 * The card's presentation, with no drag wiring, so the same markup renders both
 * in the column and inside the `DragOverlay`.
 */
export const BoardCardShell = memo(function BoardCardShell({
  task,
  columns,
  onMove,
  busy = false,
  dragHandle,
  elevated = false,
  placeholder = false,
}: BoardCardShellProps) {
  const overdue = isOverdue(task);
  const streak = task.recurrence?.currentStreak ?? 0;
  const subtaskTotal = task.subtaskCount ?? task.subtaskIds?.length ?? 0;
  const hasStateBadge = task.blocked || overdue;
  const hasValueChip =
    (task.dueDate && !overdue) || subtaskTotal > 0 || streak > 0 || typeof task.priorityScore === 'number';

  return (
    <article
      // The card names itself for assistive tech. Only the handle is draggable,
      // so the card itself is not given a "draggable" role.
      aria-label={task.title}
      className={cn(
        'relative flex items-start gap-1.5 overflow-hidden rounded-lg border border-line bg-card py-2 pr-1.5 pl-3',
        'transition-[border-color,box-shadow,opacity] duration-(--duration-fast)',
        // Micro-interactions: `@media (hover: hover)` for the desktop hover state.
        'hover:border-line-strong focus-within:border-line-strong',
        elevated && 'border-brand shadow-lg',
        // The lifted card's origin. Kept in flow so the column does not collapse
        // and re-expand under the pointer.
        placeholder && 'opacity-40',
      )}
    >
      {/*
        Rank 1 -- the state spine. `color-not-only`: every state it can show is
        also spelled out in the card body (the word "Overdue", the word
        "Blocked", the Important flag glyph), so the colour is a redundant
        second channel and never the signal itself.
      */}
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-[3px]', spineClass(task, overdue))} />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 items-start gap-1">
          {/*
            Rank 2 -- identity. Titles wrap rather than single-line truncate: a
            task title is the distinguishing name, and clamping it to keep cards
            uniform makes two similar tasks indistinguishable
            (design-system/tracker-v2/pages/tasks-surfaces.md section 3).
          */}
          <Link
            to={`/tasks/${task.id}`}
            className="min-w-0 flex-1 rounded-xs text-sm leading-snug font-medium text-fg transition-colors duration-(--duration-fast) hover:text-brand"
          >
            <span className="line-clamp-2 break-words" title={task.title}>
              {task.title}
            </span>
          </Link>
          {task.important && (
            // A property of the task's identity, not a state to triage, so it is
            // a glyph beside the name rather than a fifth pill. Shape plus text,
            // never colour alone.
            <span className="mt-0.5 shrink-0 text-brand">
              <Flag className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Important</span>
            </span>
          )}
        </div>

        {/* Rank 3 -- state badges. Only the two facts that change what you do. */}
        {hasStateBadge && (
          <div className="flex flex-wrap items-center gap-1">
            {/*
              The shared readiness badge, so the board and Task Detail never
              disagree about how "blocked" looks. `showReady` stays off: in a
              list context "not blocked" is the common case and silence is the
              right rendering (tasks-surfaces.md section 5).
            */}
            <ReadinessBadge blocked={task.blocked} ready={task.ready} />
            {/* `Ready` is deliberately not rendered here; it is never inferred from `!blocked`. */}
            {overdue && (
              <Badge variant="critical">
                <span>Overdue</span>
                {/* A task can be flagged overdue by the backend without carrying a
                    due date, so the date is additive rather than assumed. */}
                {task.dueDate && <time dateTime={task.dueDate}>{formatDate(task.dueDate)}</time>}
              </Badge>
            )}
          </div>
        )}

        {/*
          Rank 4 -- value chips. `chip-collection-reflow`: the collection wraps
          rather than clipping into a fixed-height row.
        */}
        {hasValueChip && (
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
              {task.dueDate && !overdue && (
                <CardMeta icon={<CalendarDays className="h-3 w-3" />} label="Due">
                  <time dateTime={task.dueDate}>{formatDate(task.dueDate)}</time>
                </CardMeta>
              )}
              {subtaskTotal > 0 && (
                <CardMeta icon={<ListChecks className="h-3 w-3" />} label="Subtasks">
                  <span data-numeric>
                    {task.completedSubtaskCount ?? 0}/{subtaskTotal}
                  </span>
                </CardMeta>
              )}
              {streak > 0 && (
                <CardMeta icon={<Flame className="h-3 w-3" />} label="Streak">
                  <span data-numeric>{streak} day</span>
                </CardMeta>
              )}
            </div>
            {typeof task.priorityScore === 'number' && (
              /*
                `content-jumping`: the score keeps its own stable slot outside the
                wrapping collection, so it always reads at the same place and a
                task gaining a chip never pushes it onto a line of its own.
              */
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-fg-muted">
                {/* A bare number reads as noise; the glyph names it as a metric. */}
                <Target className="h-3 w-3 shrink-0 text-fg-subtle" aria-hidden />
                <span className="sr-only">Priority score </span>
                <span className="tabular-nums" data-numeric>
                  {task.priorityScore}
                </span>
              </span>
            )}
          </div>
        )}

        {/* A Blocked badge never appears without its explanation one interaction away. */}
        {task.blocked && task.blockers && task.blockers.length > 0 && (
          <BlockerDisclosure blockers={task.blockers} variant="inline" />
        )}
      </div>

      {/*
        The action gutter. Both controls are always rendered, always focusable
        and always hit-testable -- they are de-emphasised by *contrast*, not by
        presence, so there is no hover-only affordance and no discoverability
        cliff on touch. The previous card put the drag handle at the top-left,
        the strongest position on the card, for the least important control.
      */}
      <div className="flex shrink-0 items-center gap-0.5 text-fg-subtle">
        {dragHandle}
        <TaskMoveMenu
          taskTitle={task.title}
          columns={columns}
          currentColumnId={task.boardColumnId}
          onMove={onMove}
          disabled={busy}
        />
      </div>
    </article>
  );
});

export interface BoardCardProps {
  task: TaskRecord;
  columns: BoardColumnRecord[];
  onMove: (columnId: number) => void;
  busy?: boolean;
}

export function BoardCard({ task, columns, onMove, busy = false }: BoardCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // `focus-not-obscured` (WCAG 2.2 AA): below `md` the column switcher is
      // sticky under the top bar, so a card scrolled to by the keyboard reserves
      // its height on top of the root's own scroll padding.
      className="scroll-mt-12 md:scroll-mt-0"
    >
      <BoardCardShell
        task={task}
        columns={columns}
        onMove={onMove}
        busy={busy}
        placeholder={isDragging}
        dragHandle={
          /*
            `dragging-alternative` (WCAG 2.2 AA): drag is the accelerator, the
            move menu beside it is the mechanism. Only the handle carries the
            drag listeners -- making the whole card the activator swallows the
            clicks and taps of every control inside it.

            `web-target-size` asks for 24x24 CSS px pointer targets and warns
            against assuming the native 44pt figure defines web conformance.
            This paints 32x32 and extends to 36x44 through the pseudo-element.
          */
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            className={cn(
              'relative flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-md',
              'before:absolute before:-inset-x-0.5 before:-inset-y-1.5 before:content-[""]',
              'text-fg-subtle transition-colors duration-(--duration-fast)',
              'hover:bg-inset hover:text-fg active:cursor-grabbing active:bg-inset',
            )}
            aria-label={`Drag ${task.title} to reorder. Use the move button for a menu instead.`}
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </button>
        }
      />
    </div>
  );
}
