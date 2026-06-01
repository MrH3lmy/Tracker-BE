import type { DragEvent } from 'react';
import type { TaskStatus } from '../../validation/taskStatus';
import type { BoardDropTarget } from '../../hooks/useBoardState';
import type { TaskRecord, TaskTreeNode } from './taskTypes';
import { taskStatusClassName } from './taskStyleUtils';
import { TaskCard } from './TaskCard';
import boardStyles from './TaskBoard.module.css';

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
  onComplete: (taskId: number) => void;
  onChangeStatus: (taskId: number, status: TaskStatus) => void;
  onUpdateTask: (task: TaskRecord, updates: Partial<TaskRecord>) => void;
  onSnoozeFollowUp: (task: TaskTreeNode) => void;
  onRemoveDependency: (taskId: number, blocksTaskId: number) => void;
  onDelete: (taskId: number) => void;
}

function InsertionIndicator() {
  return <div className={boardStyles.insertionIndicator} role="presentation" />;
}

export function BoardColumn({ status, statusIndex, statuses, tasks, busy, draggingTaskId, dropTarget, onDragStart, onDragOver, onDragEnd, onDrop, onClearDropTarget, onMoveTaskTo, onStartSubtask, onComplete, onChangeStatus, onUpdateTask, onSnoozeFollowUp, onRemoveDependency, onDelete }: BoardColumnProps) {
  const isDropTarget = dropTarget?.status === status;
  const columnClasses = [boardStyles.column, isDropTarget ? boardStyles.dropTarget : ''].filter(Boolean).join(' ');
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
      <header className={boardStyles.columnHeader}>
        <span className={taskStatusClassName(status)}>{status}</span>
        <strong>{tasks.length}</strong>
      </header>
      <div className={boardStyles.cardList}>
        {tasks.map((task, index) => (
          <div className={boardStyles.cardSlot} key={task.id}>
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
              onComplete={onComplete}
              onChangeStatus={onChangeStatus}
              onUpdateTask={onUpdateTask}
              onSnoozeFollowUp={onSnoozeFollowUp}
              onRemoveDependency={onRemoveDependency}
              onDelete={onDelete}
            />
          </div>
        ))}
        {isDropTarget && dropTarget.position === tasks.length && <InsertionIndicator />}
        {tasks.length === 0 && <p className={boardStyles.empty}>Drop tasks here.</p>}
      </div>
    </section>
  );
}
