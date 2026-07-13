import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { TaskRecord } from '../tasks/taskTypes';
import { Badge, cn } from '../ui';
import { BoardCard } from './BoardCard';
import type { BoardColumnRecord } from './boardTypes';

const ACCENT_BY_STATUS: Record<string, string> = {
  BACKLOG: 'border-t-line-strong',
  NOT_STARTED: 'border-t-line-strong',
  IN_PROGRESS: 'border-t-brand',
  WAITING: 'border-t-caution',
  BLOCKED: 'border-t-critical',
  DONE: 'border-t-positive',
  CANCELLED: 'border-t-line-strong',
};

interface BoardColumnProps {
  column: BoardColumnRecord;
  tasks: TaskRecord[];
}

export function BoardColumn({ column, tasks }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${column.id}`, data: { columnId: column.id } });
  const accent = ACCENT_BY_STATUS[column.status ?? ''] ?? 'border-t-line-strong';

  return (
    <section
      className="flex w-72 shrink-0 flex-col gap-3 rounded-xl border border-line bg-inset/30 p-3"
      aria-label={`${column.name} column`}
    >
      <div className={cn('flex items-center justify-between gap-2 rounded-t-md border-t-2 px-1 pt-1', accent)}>
        <h3 className="text-sm font-semibold text-fg">{column.name}</h3>
        <Badge variant="outline">{tasks.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-24 flex-col gap-2 rounded-lg p-1 transition-colors duration-(--duration-fast)',
          isOver && 'bg-brand-soft ring-2 ring-brand',
        )}
      >
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.length > 0 ? (
            tasks.map((task) => <BoardCard key={task.id} task={task} />)
          ) : (
            <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-xs text-fg-subtle" role="status">
              No tasks
            </p>
          )}
        </SortableContext>
      </div>
    </section>
  );
}
