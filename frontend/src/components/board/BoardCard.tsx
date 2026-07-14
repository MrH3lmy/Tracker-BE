import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import type { TaskRecord } from '../tasks/taskTypes';
import { formatDate, isOverdue } from '../tasks/taskUtils';
import { Badge, cn } from '../ui';

interface BoardCardProps {
  task: TaskRecord;
}

export function BoardCard({ task }: BoardCardProps) {
  const overdue = isOverdue(task);
  const streak = task.recurrence?.currentStreak ?? 0;
  const dailyTargetCount = task.dailyTargetCount ?? 1;
  const isCounterHabit = dailyTargetCount > 1;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex cursor-grab flex-col gap-2 rounded-lg border border-line bg-card p-3 shadow-2xs transition-shadow duration-(--duration-fast) active:cursor-grabbing',
        isDragging && 'z-10 scale-[1.02] shadow-(--shadow-glow-brand-lg)',
        task.important && 'border-l-2 border-l-caution',
        overdue && 'border-l-2 border-l-critical',
      )}
      aria-roledescription="draggable task card"
      aria-label={`${task.title}${task.status ? `, status ${task.status}` : ''}`}
    >
      <Link
        to={`/tasks/${task.id}`}
        className="truncate text-sm font-medium text-fg hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        #{task.id} {task.title}
      </Link>
      <div className="flex flex-wrap items-center gap-1.5" aria-label="Task metadata">
        {typeof task.priorityScore === 'number' && <Badge variant="brand">Score {task.priorityScore}</Badge>}
        {task.dueDate && (
          <Badge variant={overdue ? 'critical' : 'outline'}>
            Due {formatDate(task.dueDate)}
          </Badge>
        )}
        {task.important ? <Badge variant="caution">Important</Badge> : null}
        {streak > 0 && <Badge variant="caution">🔥 {streak}</Badge>}
        {isCounterHabit && <Badge variant="outline">{task.todayCheckInCount ?? 0}/{dailyTargetCount} today</Badge>}
      </div>
    </article>
  );
}
