import type { DragEvent } from 'react';
import type { TaskStatus } from '../../validation/taskStatus';
import type { BoardDropTarget } from '../../hooks/useBoardState';
import type { TaskTreeNode } from './taskTypes';
import { TaskCard } from './TaskCard';

interface BoardColumnProps {
  status: TaskStatus;
  statusIndex: number;
  statuses: TaskStatus[];
  tasks: TaskTreeNode[];
  busy: boolean;
  draggingTaskId: number | null;
  dropTarget: BoardDropTarget | null;
  onDragStart: (event: DragEvent<HTMLElement>, taskId: number) => void;
  onDragOver: (event: DragEvent<HTMLElement>, targetStatus: TaskStatus, position: number) => void;
  onDragEnd: () => void;
  onDrop: (event: DragEvent<HTMLElement>, targetStatus: TaskStatus, position: number) => void;
  onClearDropTarget: () => void;
  onMoveTaskTo: (taskId: number, targetStatus: TaskStatus, position: number) => void;
  onStartSubtask: (task: TaskTreeNode) => void;
}

function InsertionIndicator() {
  return <div className="task-board-insertion-indicator" role="presentation" />;
}

export function BoardColumn({ status, statusIndex, statuses, tasks, busy, draggingTaskId, dropTarget, onDragStart, onDragOver, onDragEnd, onDrop, onClearDropTarget, onMoveTaskTo, onStartSubtask }: BoardColumnProps) {
  const isDropTarget = dropTarget?.status === status;
  const columnClasses = ['task-board-column', isDropTarget ? 'drop-target' : ''].filter(Boolean).join(' ');
  const previousStatus = statuses[statusIndex - 1];
  const nextStatus = statuses[statusIndex + 1];

  return (
    <section
      className={columnClasses}
      onDragOver={(event) => onDragOver(event, status, tasks.length)}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onClearDropTarget();
      }}
      onDrop={(event) => onDrop(event, status, tasks.length)}
    >
      <header className="task-board-column-header">
        <span className={`status-badge task-status-badge status-task-${status.toLowerCase().replaceAll('_', '-')}`}>{status}</span>
        <strong>{tasks.length}</strong>
      </header>
      <div className="task-board-card-list">
        {tasks.map((task, index) => (
          <div className="task-board-card-slot" key={task.id}>
            {isDropTarget && dropTarget.position === index && <InsertionIndicator />}
            <TaskCard
              task={task}
              columnStatus={status}
              previousStatus={previousStatus}
              nextStatus={nextStatus}
              index={index}
              columnTaskCount={tasks.length}
              busy={busy}
              draggingTaskId={draggingTaskId}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
              onMoveTaskTo={onMoveTaskTo}
              onStartSubtask={onStartSubtask}
            />
          </div>
        ))}
        {isDropTarget && dropTarget.position === tasks.length && <InsertionIndicator />}
        {tasks.length === 0 && <p className="task-board-empty">Drop tasks here.</p>}
      </div>
    </section>
  );
}
