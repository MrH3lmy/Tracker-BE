import type { DragEvent } from 'react';
import type { TaskStatus } from '../../validation/taskStatus';
import type { TaskTreeNode } from './taskTypes';
import { TaskCard } from './TaskCard';

interface BoardColumnProps {
  status: TaskStatus;
  tasks: TaskTreeNode[];
  busy: boolean;
  draggingTaskId: number | null;
  onDragStart: (event: DragEvent<HTMLElement>, taskId: number) => void;
  onDragEnd: () => void;
  onDrop: (event: DragEvent<HTMLElement>, targetStatus: TaskStatus, position: number) => void;
  onStartSubtask: (task: TaskTreeNode) => void;
}

export function BoardColumn({ status, tasks, busy, draggingTaskId, onDragStart, onDragEnd, onDrop, onStartSubtask }: BoardColumnProps) {
  return (
    <section className="task-board-column" onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, status, tasks.length)}>
      <header className="task-board-column-header">
        <span className={`status-badge task-status-badge status-task-${status.toLowerCase().replaceAll('_', '-')}`}>{status}</span>
        <strong>{tasks.length}</strong>
      </header>
      <div className="task-board-card-list">
        {tasks.map((task, index) => (
          <TaskCard key={task.id} task={task} columnStatus={status} index={index} busy={busy} draggingTaskId={draggingTaskId} onDragStart={onDragStart} onDragEnd={onDragEnd} onDrop={onDrop} onStartSubtask={onStartSubtask} />
        ))}
        {tasks.length === 0 && <p className="task-board-empty">Drop tasks here.</p>}
      </div>
    </section>
  );
}
