import type { DragEvent } from 'react';
import type { TaskStatus } from '../../validation/taskStatus';
import type { TaskTreeNode } from './taskTypes';
import { formatDate, formatValue, isOverdue, renderDueDate, subtaskSummary } from './taskUtils';
import styles from './TaskCard.module.css';

interface TaskCardProps {
  task: TaskTreeNode;
  columnStatus: TaskStatus;
  previousStatus?: TaskStatus;
  nextStatus?: TaskStatus;
  index: number;
  columnTaskCount: number;
  depth?: number;
  busy: boolean;
  draggingTaskId: number | null;
  onDragStart: (event: DragEvent<HTMLElement>, taskId: number) => void;
  onDragOver: (event: DragEvent<HTMLElement>, targetStatus: TaskStatus, position: number) => void;
  onDragEnd: () => void;
  onDrop: (event: DragEvent<HTMLElement>, targetStatus: TaskStatus, position: number) => void;
  onMoveTaskTo: (taskId: number, targetStatus: TaskStatus, position: number) => void;
  onStartSubtask: (task: TaskTreeNode) => void;
}

function getHoveredPosition(event: DragEvent<HTMLElement>, index: number) {
  const rect = event.currentTarget.getBoundingClientRect();
  const isAfterMidpoint = event.clientY > rect.top + rect.height / 2;
  return index + (isAfterMidpoint ? 1 : 0);
}

export function TaskCard({ task, columnStatus, previousStatus, nextStatus, index, columnTaskCount, depth = 0, busy, draggingTaskId, onDragStart, onDragOver, onDragEnd, onDrop, onMoveTaskTo, onStartSubtask }: TaskCardProps) {
  const overdue = isOverdue(task);
  const summary = subtaskSummary(task);
  const isDragging = draggingTaskId === task.id;
  const cardClasses = ['task-board-card', styles.card, task.important ? 'task-row-important' : '', overdue ? 'task-row-overdue' : '', isDragging ? `dragging ${styles.dragging}` : ''].filter(Boolean).join(' ');
  const canMoveUp = !busy && index > 0;
  const canMoveDown = !busy && index < columnTaskCount - 1;

  return (
    <article
      className={cardClasses}
      draggable={!busy}
      onDragStart={(event) => onDragStart(event, task.id)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.stopPropagation();
        onDragOver(event, columnStatus, getHoveredPosition(event, index));
      }}
      onDrop={(event) => onDrop(event, columnStatus, getHoveredPosition(event, index))}
      style={{ marginLeft: depth ? `${depth * 1.25}rem` : undefined }}
    >
      <div className="task-board-card-title">
        <strong>#{task.id} {task.title}</strong>
        {task.important && <span className="task-important-pill">Important</span>}
      </div>
      {task.description && <p className="task-description">{task.description}</p>}
      {summary && <p className="task-description subtask-progress">{summary}</p>}
      {(task.dependencyIds?.length || task.blockingTaskIds?.length || task.parentTaskId) ? <p className="task-description">Parent {task.parentTaskId ? `#${task.parentTaskId}` : '—'} · Blocked by {task.dependencyIds?.map((id) => `#${id}`).join(', ') || '—'} · Blocks {task.blockingTaskIds?.map((id) => `#${id}`).join(', ') || '—'}</p> : null}
      <dl className="task-board-meta">
        <div><dt>Start</dt><dd>{formatDate(task.startDate)}</dd></div>
        <div><dt>Due</dt><dd className={overdue ? 'task-date-overdue' : ''}>{renderDueDate(task, overdue)}</dd></div>
        <div><dt>Estimate</dt><dd>{formatValue(task.estimatedMinutes)}</dd></div>
        <div><dt>Actual</dt><dd>{formatValue(task.actualMinutes)}</dd></div>
        <div><dt>Risk</dt><dd>{formatValue(task.riskLevel)}</dd></div>
        <div><dt>Track</dt><dd>{formatValue(task.track)}</dd></div>
        <div><dt>Phase</dt><dd>{formatValue(task.phase)}</dd></div>
        <div><dt>Area</dt><dd>{formatValue(task.area)}</dd></div>
        <div><dt>Effort</dt><dd>{formatValue(task.effort)}</dd></div>
        <div><dt>Score</dt><dd>{formatValue(task.priorityScore)}</dd></div>
      </dl>
      <div className="task-actions">
        <button type="button" onClick={() => onStartSubtask(task)} disabled={busy}>Add subtask</button>
      </div>
      <div className={styles.keyboardControls} aria-label={`Keyboard move controls for task ${task.id}`}>
        <button type="button" onClick={() => onMoveTaskTo(task.id, columnStatus, index - 1)} disabled={!canMoveUp}>Move up</button>
        <button type="button" onClick={() => onMoveTaskTo(task.id, columnStatus, index + 1)} disabled={!canMoveDown}>Move down</button>
        <button type="button" onClick={() => previousStatus && onMoveTaskTo(task.id, previousStatus, 0)} disabled={busy || !previousStatus}>Move left</button>
        <button type="button" onClick={() => nextStatus && onMoveTaskTo(task.id, nextStatus, 0)} disabled={busy || !nextStatus}>Move right</button>
      </div>
      {task.subtasks.length > 0 && (
        <div className="subtask-list">
          {task.subtasks.map((subtask, subtaskIndex) => (
            <TaskCard key={subtask.id} task={subtask} columnStatus={columnStatus} previousStatus={previousStatus} nextStatus={nextStatus} index={subtaskIndex} columnTaskCount={task.subtasks.length} depth={depth + 1} busy={busy} draggingTaskId={draggingTaskId} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDrop={onDrop} onMoveTaskTo={onMoveTaskTo} onStartSubtask={onStartSubtask} />
          ))}
        </div>
      )}
    </article>
  );
}
