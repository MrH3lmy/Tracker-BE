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
  onCreateTaskForStatus: (status: TaskStatus) => void;
  onComplete: (taskId: number) => void;
  onChangeStatus: (taskId: number, status: TaskStatus) => void;
  onUpdateTask: (task: TaskRecord, updates: Partial<TaskRecord>) => void;
  onSnoozeFollowUp: (task: TaskTreeNode) => void;
  onRemoveDependency: (taskId: number, blocksTaskId: number) => void;
  onDelete: (taskId: number) => void;
}

const statusIconByStatus: Record<TaskStatus, string> = {
  BACKLOG: '💼',
  NOT_STARTED: '▶',
  IN_PROGRESS: '◌',
  WAITING: '⏳',
  BLOCKED: '⛔',
  DONE: '✓',
  CANCELLED: '×',
};

const statusLabelByStatus: Record<TaskStatus, string> = {
  BACKLOG: 'Backlog',
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  WAITING: 'Waiting',
  BLOCKED: 'Blocked',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
};

interface EmptyColumnStateProps {
  status: TaskStatus;
  statusLabel: string;
  busy: boolean;
  onCreateTaskForStatus: (status: TaskStatus) => void;
}

const emptyTitleByStatus: Record<TaskStatus, string> = {
  BACKLOG: 'No backlog tasks',
  NOT_STARTED: 'No tasks not started',
  IN_PROGRESS: 'No tasks in progress',
  WAITING: 'No waiting tasks',
  BLOCKED: 'No blocked tasks',
  DONE: 'No done tasks',
  CANCELLED: 'No cancelled tasks',
};

export function EmptyColumnState({ status, statusLabel, busy, onCreateTaskForStatus }: EmptyColumnStateProps) {
  return (
    <div className={boardStyles.empty} aria-label={`${statusLabel} empty state`}>
      <div className={boardStyles.emptyIllustration} aria-hidden="true">
        <span className={boardStyles.emptyIllustrationIcon}>{statusIconByStatus[status]}</span>
        <span className={boardStyles.emptyIllustrationCard} />
      </div>
      <div className={boardStyles.emptyCopy}>
        <h4>{emptyTitleByStatus[status]}</h4>
        <p>Drag a task here to get started.</p>
      </div>
      <button
        type="button"
        className={boardStyles.emptyActionButton}
        onClick={() => onCreateTaskForStatus(status)}
        disabled={busy}
      >
        Add task
      </button>
    </div>
  );
}

function InsertionIndicator() {
  return <div className={boardStyles.insertionIndicator} role="presentation" />;
}

function formatStatusLabel(status: TaskStatus) {
  return statusLabelByStatus[status];
}

export function BoardColumn({ status, statusIndex, statuses, tasks, busy, draggingTaskId, dropTarget, onDragStart, onDragOver, onDragEnd, onDrop, onClearDropTarget, onMoveTaskTo, onStartSubtask, onCreateTaskForStatus, onComplete, onChangeStatus, onUpdateTask, onSnoozeFollowUp, onRemoveDependency, onDelete }: BoardColumnProps) {
  const isDropTarget = dropTarget?.status === status;
  const columnClasses = [boardStyles.column, isDropTarget ? boardStyles.dropTarget : ''].filter(Boolean).join(' ');
  const previousStatus = statuses[statusIndex - 1];
  const nextStatus = statuses[statusIndex + 1];
  const headingId = `task-board-column-${status}`;
  const statusLabel = formatStatusLabel(status);

  return (
    <section
      className={columnClasses}
      aria-labelledby={headingId}
      onDragOver={(event) => onDragOver(event, status, tasks.length)}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onClearDropTarget();
      }}
      onDrop={(event) => onDrop(event, status, tasks.length)}
    >
      <header className={boardStyles.columnHeader}>
        <div className={boardStyles.columnHeaderContent}>
          <span className={boardStyles.statusIcon} aria-hidden="true">{statusIconByStatus[status]}</span>
          <span id={headingId} className={taskStatusClassName(status)}>{statusLabel}</span>
          <span className={boardStyles.columnCount} aria-label={`${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`}>{tasks.length}</span>
        </div>
        <div className={boardStyles.columnActions} aria-label={`${statusLabel} column actions`}>
          <button type="button" className={boardStyles.columnActionButton} aria-label={`Add task to ${statusLabel}`} title="Add task" onClick={() => onCreateTaskForStatus(status)} disabled={busy}>+</button>
          <button type="button" className={boardStyles.columnActionButton} aria-label={`${statusLabel} more actions`} title="More actions">…</button>
        </div>
      </header>
      <div className={boardStyles.cardList} aria-label={`${statusLabel} tasks`}>
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
        {tasks.length === 0 && (
          <EmptyColumnState
            status={status}
            statusLabel={statusLabel}
            busy={busy}
            onCreateTaskForStatus={onCreateTaskForStatus}
          />
        )}
      </div>
    </section>
  );
}
