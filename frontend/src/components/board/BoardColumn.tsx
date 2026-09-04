import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { TaskRecord } from '../tasks/taskTypes';
import { Badge, cn } from '../ui';
import { BoardCard } from './BoardCard';
import type { BoardColumnRecord } from './boardTypes';

interface BoardColumnProps {
  column: BoardColumnRecord;
  columns: BoardColumnRecord[];
  tasks: TaskRecord[];
  onMove: (taskId: number, columnId: number) => void;
  busy?: boolean;
  /** Mobile shows one column at a time, so it fills the width instead of sitting in a rail. */
  fullWidth?: boolean;
}

export function BoardColumn({ column, columns, tasks, onMove, busy = false, fullWidth = false }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${column.id}`, data: { columnId: column.id } });

  return (
    <section
      className={cn('flex shrink-0 flex-col gap-2.5', fullWidth ? 'w-full' : 'w-72')}
      aria-label={`${column.name} column, ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`}
    >
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h3 className="truncate text-sm font-semibold text-fg">{column.name}</h3>
        <Badge variant="outline">{tasks.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-24 flex-1 flex-col gap-2 rounded-lg border p-2 transition-colors duration-(--duration-fast)',
          // The drop target reads as a target through both a border change and a
          // background change, never colour alone.
          isOver ? 'border-brand bg-brand-soft' : 'border-line bg-inset',
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
            <p className="rounded-md border border-dashed border-line px-3 py-6 text-center text-xs text-fg-subtle" role="status">
              Nothing in {column.name}
            </p>
          )}
        </SortableContext>
      </div>
    </section>
  );
}
