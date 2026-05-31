import type { DragEvent } from 'react';
import type { TaskStatus } from '../../validation/taskStatus';
import type { TaskTreeNode } from './taskTypes';
import { formatDate, formatValue, isOverdue, renderDueDate, subtaskSummary } from './taskUtils';

interface TaskCardProps {
  task: TaskTreeNode;
  columnStatus: TaskStatus;
  index: number;
  depth?: number;
  busy: boolean;
  draggingTaskId: number | null;
  onDragStart: (event: DragEvent<HTMLElement>, taskId: number) => void;
  onDragEnd: () => void;
  onDrop: (event: DragEvent<HTMLElement>, targetStatus: TaskStatus, position: number) => void;
  onStartSubtask: (task: TaskTreeNode) => void;
}

export function TaskCard({ task, columnStatus, index, depth = 0, busy, draggingTaskId, onDragStart, onDragEnd, onDrop, onStartSubtask }: TaskCardProps) {
  const overdue = isOverdue(task);
  const summary = subtaskSummary(task);

  return (
    <article
      className={`task-board-card ${task.important ? 'task-row-important' : ''} ${overdue ? 'task-row-overdue' : ''} ${draggingTaskId === task.id ? 'dragging' : ''}`.trim()}
      draggable={!busy}
      onDragStart={(event) => onDragStart(event, task.id)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDrop(event, columnStatus, index)}
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
      <div className="task-actions"><button type="button" onClick={() => onStartSubtask(task)} disabled={busy}>Add subtask</button></div>
      {task.subtasks.length > 0 && (
        <div className="subtask-list">
          {task.subtasks.map((subtask, subtaskIndex) => (
            <TaskCard key={subtask.id} task={subtask} columnStatus={columnStatus} index={subtaskIndex} depth={depth + 1} busy={busy} draggingTaskId={draggingTaskId} onDragStart={onDragStart} onDragEnd={onDragEnd} onDrop={onDrop} onStartSubtask={onStartSubtask} />
          ))}
        </div>
      )}
    </article>
  );
}
