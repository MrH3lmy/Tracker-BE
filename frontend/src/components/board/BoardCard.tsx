import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import type { TaskRecord } from '../tasks/taskTypes';
import { formatDate, isOverdue } from '../tasks/taskUtils';
import { ReadinessBadge } from '../tasks/ReadinessBadge';
import { BlockerDisclosure } from '../tasks/BlockerDisclosure';
import { TaskMoveMenu } from '../tasks/TaskMoveMenu';
import type { BoardColumnRecord } from './boardTypes';
import { Badge, cn } from '../ui';
import { Flame, GripVertical } from '../ui/icons';

interface BoardCardProps {
  task: TaskRecord;
  columns: BoardColumnRecord[];
  onMove: (columnId: number) => void;
  busy?: boolean;
}

export function BoardCard({ task, columns, onMove, busy = false }: BoardCardProps) {
  const overdue = isOverdue(task);
  const streak = task.recurrence?.currentStreak ?? 0;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = { transform: CSS.Translate.toString(transform), transition };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-line bg-card p-2.5',
        'transition-[border-color,box-shadow] duration-(--duration-fast)',
        isDragging && 'z-10 border-brand shadow-lg',
      )}
      // The card names itself for assistive tech; the drag handle below is the
      // only draggable element, so the card itself is not a "draggable" role.
      aria-label={task.title}
    >
      <div className="flex items-start gap-1.5">
        {/*
          Only the handle carries the drag listeners. The whole card used to be the
          activator, which swallowed clicks on everything inside it and forced a
          `cursor-grab` onto a card whose primary affordance is a link.
        */}
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          // web-target-size: 24x24 CSS px minimum for a pointer target.
          className="mt-px flex h-6 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-fg-subtle hover:bg-inset hover:text-fg-muted active:cursor-grabbing"
          aria-label={`Drag ${task.title} to reorder. Use the move button for a menu instead.`}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>

        {/*
          Titles wrap rather than single-line truncate: a task title is the
          distinguishing name, and clamping it to keep cards uniform makes two
          similar tasks indistinguishable.
        */}
        <Link
          to={`/tasks/${task.id}`}
          className="min-w-0 flex-1 rounded-xs text-sm font-medium text-fg hover:underline"
        >
          <span className="line-clamp-2 break-words" title={task.title}>
            {task.title}
          </span>
        </Link>

        <TaskMoveMenu
          taskTitle={task.title}
          columns={columns}
          currentColumnId={task.boardColumnId}
          onMove={onMove}
          disabled={busy}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pl-7" aria-label="Task metadata">
        {/* Readiness is backend truth and the single most decision-relevant fact
            on a triage surface. The board previously showed neither axis. */}
        <ReadinessBadge blocked={task.blocked} ready={task.ready} />
        {task.dueDate && (
          <Badge variant={overdue ? 'critical' : 'outline'}>
            <time dateTime={task.dueDate}>{overdue ? 'Overdue' : 'Due'} {formatDate(task.dueDate)}</time>
          </Badge>
        )}
        {typeof task.priorityScore === 'number' && <Badge variant="outline">Score {task.priorityScore}</Badge>}
        {task.important ? <Badge variant="caution">Important</Badge> : null}
        {streak > 0 && (
          // Was an emoji; emoji as an icon is an anti-pattern in the foundation.
          <Badge variant="outline">
            <Flame className="h-3 w-3" aria-hidden />
            {streak} day streak
          </Badge>
        )}
      </div>

      {task.blocked && task.blockers && task.blockers.length > 0 && (
        <div className="pl-7">
          <BlockerDisclosure blockers={task.blockers} />
        </div>
      )}
    </article>
  );
}
