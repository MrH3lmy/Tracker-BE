import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { TASK_STATUS_VALUES, type TaskStatus } from '../../validation/taskStatus';
import type { TaskRecord, TaskTreeNode } from './taskTypes';
import { formatDate, formatValue, isOverdue, subtaskSummary } from './taskUtils';
import styles from './TaskCard.module.css';
import { taskStatusClassName } from './taskStyleUtils';

const AREA_VALUES = ['WORK', 'STUDY', 'PERSONAL', 'HEALTH', 'FAMILY'] as const;
const EFFORT_VALUES = ['QUICK', 'MEDIUM', 'DEEP_WORK', 'LARGE'] as const;

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
  onComplete: (taskId: number) => void;
  onChangeStatus: (taskId: number, status: TaskStatus) => void;
  onUpdateTask: (task: TaskRecord, updates: Partial<TaskRecord>) => void;
  onSnoozeFollowUp: (task: TaskTreeNode) => void;
  onRemoveDependency: (taskId: number, blocksTaskId: number) => void;
  onDelete: (taskId: number) => void;
}

function getHoveredPosition(event: DragEvent<HTMLElement>, index: number) {
  const rect = event.currentTarget.getBoundingClientRect();
  const isAfterMidpoint = event.clientY > rect.top + rect.height / 2;
  return index + (isAfterMidpoint ? 1 : 0);
}

const commitHint = 'Enter to save, Esc to cancel';
const subtaskPreviewLimit = 3;

const isSubtaskComplete = (subtask: TaskTreeNode) => subtask.status === 'DONE' || Boolean(subtask.completedDate);

export function TaskCard({ task, columnStatus, previousStatus, nextStatus, index, columnTaskCount, depth = 0, busy, draggingTaskId, onDragStart, onDragOver, onDragEnd, onDrop, onMoveTaskTo, onStartSubtask, onComplete, onChangeStatus, onUpdateTask, onSnoozeFollowUp, onRemoveDependency, onDelete }: TaskCardProps) {
  const overdue = isOverdue(task);
  const subtaskTotal = task.subtaskCount ?? task.subtaskIds?.length ?? task.subtasks.length;
  const completedSubtaskCount = task.completedSubtaskCount ?? task.subtasks.filter(isSubtaskComplete).length;
  const subtaskProgressPercent = subtaskTotal > 0 ? task.subtaskProgressPercent ?? Math.round((completedSubtaskCount * 100) / subtaskTotal) : 0;
  const summary = subtaskSummary({ ...task, subtaskCount: subtaskTotal, completedSubtaskCount, subtaskProgressPercent });
  const previewSubtasks = task.subtasks.slice(0, subtaskPreviewLimit);
  const hiddenSubtaskCount = Math.max(subtaskTotal - previewSubtasks.length, 0);
  const isDragging = draggingTaskId === task.id;
  const cardClasses = [styles.cardShell, styles.card, task.important ? styles.rowImportant : '', overdue ? styles.rowOverdue : '', isDragging ? styles.dragging : ''].filter(Boolean).join(' ');
  const canMoveUp = !busy && index > 0;
  const canMoveDown = !busy && index < columnTaskCount - 1;
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);

  useEffect(() => {
    if (isEditingTitle) titleInputRef.current?.focus();
  }, [isEditingTitle]);

  const cancelTitleEdit = () => {
    setDraftTitle(task.title);
    setIsEditingTitle(false);
  };

  const commitTitleEdit = () => {
    const nextTitle = draftTitle.trim();
    if (!nextTitle) {
      cancelTitleEdit();
      return;
    }
    if (nextTitle !== task.title) onUpdateTask(task, { title: nextTitle });
    setDraftTitle(nextTitle);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitTitleEdit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelTitleEdit();
    }
  };

  const titleId = `task-card-title-${task.id}`;
  const statusSelectId = `task-card-status-${task.id}`;
  const areaSelectId = `task-card-area-${task.id}`;
  const effortSelectId = `task-card-effort-${task.id}`;
  const followUpId = `task-card-follow-up-${task.id}`;
  const moveHintId = `task-card-move-hint-${task.id}`;
  const assignee = (task as TaskTreeNode & { assignee?: string | number | boolean | null }).assignee;
  const status = task.status ?? columnStatus;
  const effortBadgeClasses = [
    styles.effortBadge,
    task.effort === 'MEDIUM' ? styles.effortBadgeMedium : '',
    task.effort === 'HIGH' || task.effort === 'DEEP_WORK' || task.effort === 'LARGE' ? styles.effortBadgeHigh : '',
  ].filter(Boolean).join(' ');

  return (
    <article
      className={cardClasses}
      draggable={!busy && !isEditingTitle}
      onDragStart={(event) => onDragStart(event, task.id)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.stopPropagation();
        onDragOver(event, columnStatus, getHoveredPosition(event, index));
      }}
      onDrop={(event) => onDrop(event, columnStatus, getHoveredPosition(event, index))}
      style={{ marginLeft: depth ? `${depth * 1.25}rem` : undefined }}
      tabIndex={0}
      aria-labelledby={titleId}
      aria-describedby={moveHintId}
    >
      <div className={styles.cardHeader}>
        <div className={`${styles.title} ${styles.boardTitle}`}>
          {isEditingTitle ? (
            <label className={styles.titleEditor}>
              <span className="sr-only">Edit title for task {task.id}</span>
              <input
                ref={titleInputRef}
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={commitTitleEdit}
                onKeyDown={handleTitleKeyDown}
                disabled={busy}
                maxLength={255}
                title={commitHint}
                aria-describedby={`${titleId}-hint`}
              />
              <span id={`${titleId}-hint`} className="sr-only">{commitHint}</span>
            </label>
          ) : (
            <strong id={titleId}>#{task.id} {task.title}</strong>
          )}
          <div className={styles.badgeRow} aria-label={`Task badges for ${task.title}`}>
            <span className={taskStatusClassName(status)}>{status}</span>
            {task.effort ? <span className={effortBadgeClasses}>Effort {formatValue(task.effort)}</span> : null}
            {task.priorityScore != null ? <span className={styles.scoreBadge}>Score {formatValue(task.priorityScore)}</span> : null}
            {task.important && <span className={styles.importantPill}>Important</span>}
          </div>
        </div>
        <div className={styles.statusRow}>
          <label htmlFor={statusSelectId} className="sr-only">Change status for task {task.id}</label>
          <select
            id={statusSelectId}
            className={styles.statusSelect}
            value={status}
            onChange={(event) => onChangeStatus(task.id, event.target.value as TaskStatus)}
            disabled={busy}
            title="Change status (Tab, then arrows)"
            aria-label={`Change status for ${task.title}`}
          >
            {TASK_STATUS_VALUES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
      </div>
      <p id={moveHintId} className="sr-only">Use the task move controls to move this card before or after nearby cards, or between adjacent status columns.</p>
      <div className={styles.quickActions} aria-label={`Quick actions for ${task.title}`}>
        <button type="button" onClick={() => onComplete(task.id)} disabled={busy} title="Complete task (Tab to reach)">✓<span className="sr-only">Complete {task.title}</span></button>
        <button type="button" onClick={() => { setDraftTitle(task.title); setIsEditingTitle(true); }} disabled={busy} title="Edit title (Enter saves, Esc cancels)">✎<span className="sr-only">Edit title for {task.title}</span></button>
        <button type="button" onClick={() => onDelete(task.id)} disabled={busy} title="Delete task (Tab to reach)">🗑<span className="sr-only">Delete {task.title}</span></button>
      </div>
      {task.description && <p className={styles.description}>{task.description}</p>}
      {(task.dependencyIds?.length || task.blockingTaskIds?.length || task.parentTaskId) ? <p className={styles.description}>Parent {task.parentTaskId ? `#${task.parentTaskId}` : '—'} · Blocked by {task.dependencyIds?.map((id) => `#${id}`).join(', ') || '—'} · Blocks {task.blockingTaskIds?.map((id) => `#${id}`).join(', ') || '—'}</p> : null}
      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <dt>Due date</dt>
            <dd>
              <span className={styles.metaIcon} aria-hidden="true">📅</span>
              <span className={styles.metaStack}>
                {overdue ? (
                  <>
                    <span className={styles.dateOverdue}>{formatDate(task.dueDate)}</span>
                    <span className={styles.overdueHint}>Overdue</span>
                  </>
                ) : (
                  <>
                    <span>{formatDate(task.dueDate)}</span>
                    <span className={styles.metaSubvalue}>Start {formatDate(task.startDate)}</span>
                  </>
                )}
              </span>
            </dd>
          </div>
          {assignee ? (
            <div className={styles.metaItem}>
              <dt>Assignee</dt>
              <dd><span className={styles.metaIcon} aria-hidden="true">👤</span>{formatValue(assignee)}</dd>
            </div>
          ) : null}
          <div className={styles.metaItem}>
            <dt>Effort</dt>
            <dd><span className={styles.metaIcon} aria-hidden="true">⚡</span>{formatValue(task.effort)}</dd>
          </div>
        </div>
        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <dt>Area</dt>
            <dd><span className={styles.metaIcon} aria-hidden="true">▣</span>{formatValue(task.area)}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt>Track</dt>
            <dd><span className={styles.metaIcon} aria-hidden="true">🛤</span>{formatValue(task.track)}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt>Score</dt>
            <dd><span className={styles.metaIcon} aria-hidden="true">★</span>{formatValue(task.priorityScore)}</dd>
          </div>
        </div>
        {(task.riskLevel || task.phase || task.estimatedMinutes != null || task.actualMinutes != null) ? (
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <dt>Risk</dt>
              <dd><span className={styles.metaIcon} aria-hidden="true">⚠</span>{formatValue(task.riskLevel)}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt>Phase</dt>
              <dd><span className={styles.metaIcon} aria-hidden="true">◆</span>{formatValue(task.phase)}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt>Estimate / actual</dt>
              <dd><span className={styles.metaIcon} aria-hidden="true">⏱</span>{formatValue(task.estimatedMinutes)} / {formatValue(task.actualMinutes)}</dd>
            </div>
          </div>
        ) : null}
      </dl>
      <div className={styles.actions}>
        <button type="button" onClick={() => onStartSubtask(task)} disabled={busy} title="Add subtask (Tab to reach)">Add subtask</button>
      </div>
      {summary && (
        <section className={styles.subtaskProgress} aria-label={`Subtask progress for ${task.title}`}>
          <div className={styles.subtaskProgressHeader}>
            <span className={styles.subtaskProgressCount}>{completedSubtaskCount}/{subtaskTotal} completed</span>
            <span className={styles.subtaskProgressPercent}>{subtaskProgressPercent}%</span>
          </div>
          <div className={styles.subtaskProgressTrack} role="progressbar" aria-valuenow={subtaskProgressPercent} aria-valuemin={0} aria-valuemax={100} aria-label={summary}>
            <span className={styles.subtaskProgressFill} style={{ width: `${subtaskProgressPercent}%` }} />
          </div>
          {previewSubtasks.length > 0 ? (
            <ul className={styles.subtaskChecklist} aria-label={`Preview subtasks for ${task.title}`}>
              {previewSubtasks.map((subtask) => {
                const complete = isSubtaskComplete(subtask);
                return (
                  <li key={subtask.id} className={complete ? styles.subtaskChecklistItemComplete : styles.subtaskChecklistItem}>
                    <span className={styles.subtaskCheckIcon} aria-hidden="true">{complete ? '✓' : ''}</span>
                    <span className={styles.subtaskChecklistTitle}>#{subtask.id} {subtask.title}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {task.subtasks.length > 0 ? (
            <details className={styles.subtaskDetails}>
              <summary className={styles.subtaskDetailsSummary}>{hiddenSubtaskCount > 0 ? `View all subtasks (${subtaskTotal})` : `View subtask details (${subtaskTotal})`}</summary>
              <div className={styles.subtaskList}>
                {task.subtasks.map((subtask, subtaskIndex) => (
                  <TaskCard key={subtask.id} task={subtask} columnStatus={columnStatus} previousStatus={previousStatus} nextStatus={nextStatus} index={subtaskIndex} columnTaskCount={task.subtasks.length} depth={depth + 1} busy={busy} draggingTaskId={draggingTaskId} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDrop={onDrop} onMoveTaskTo={onMoveTaskTo} onStartSubtask={onStartSubtask} onComplete={onComplete} onChangeStatus={onChangeStatus} onUpdateTask={onUpdateTask} onSnoozeFollowUp={onSnoozeFollowUp} onRemoveDependency={onRemoveDependency} onDelete={onDelete} />
                ))}
              </div>
            </details>
          ) : null}
        </section>
      )}
      <details className={styles.secondaryMenu}>
        <summary title="Open more task actions (Enter/Space)">More actions</summary>
        <div className={styles.secondaryActions}>
          <label htmlFor={`${statusSelectId}-menu`}>Status</label>
          <select id={`${statusSelectId}-menu`} value={task.status ?? columnStatus} onChange={(event) => onChangeStatus(task.id, event.target.value as TaskStatus)} disabled={busy}>
            {TASK_STATUS_VALUES.map((status) => <option key={`${task.id}-menu-${status}`} value={status}>{status}</option>)}
          </select>
          <label htmlFor={effortSelectId}>Effort</label>
          <select id={effortSelectId} value={task.effort ?? ''} onChange={(event) => onUpdateTask(task, { effort: event.target.value || undefined })} disabled={busy}>
            <option value="">No effort</option>
            {EFFORT_VALUES.map((effort) => <option key={effort} value={effort}>{effort}</option>)}
          </select>
          <label htmlFor={areaSelectId}>Area</label>
          <select id={areaSelectId} value={task.area ?? ''} onChange={(event) => onUpdateTask(task, { area: event.target.value || undefined })} disabled={busy}>
            <option value="">No area</option>
            {AREA_VALUES.map((area) => <option key={area} value={area}>{area}</option>)}
          </select>
          <label htmlFor={followUpId}>Follow-up</label>
          <input id={followUpId} type="date" value={task.followUpDate ?? ''} min={task.startDate?.slice(0, 10)} onChange={(event) => onUpdateTask(task, { followUpDate: event.target.value || undefined })} disabled={busy} title="Set follow-up date" />
          <button type="button" onClick={() => onSnoozeFollowUp(task)} disabled={busy} title="Set follow-up for tomorrow">Follow up tomorrow</button>
          {task.dependencyIds?.map((blocksTaskId) => <button key={`${task.id}-${blocksTaskId}`} type="button" onClick={() => onRemoveDependency(task.id, blocksTaskId)} disabled={busy} title={`Remove dependency on task ${blocksTaskId}`}>Unlink #{blocksTaskId}</button>)}
          <button type="button" onClick={() => onDelete(task.id)} disabled={busy} title="Delete task">Delete</button>
        </div>
      </details>
      <div className={styles.keyboardControls} aria-label={`Keyboard move controls for task ${task.id}`}>
        <button type="button" onClick={() => onMoveTaskTo(task.id, columnStatus, index - 1)} disabled={!canMoveUp} title="Move before the previous card" aria-label={`Move ${task.title} before the previous card in ${columnStatus}`}>Move up</button>
        <button type="button" onClick={() => onMoveTaskTo(task.id, columnStatus, index + 1)} disabled={!canMoveDown} title="Move after the next card" aria-label={`Move ${task.title} after the next card in ${columnStatus}`}>Move down</button>
        <button type="button" onClick={() => previousStatus && onMoveTaskTo(task.id, previousStatus, 0)} disabled={busy || !previousStatus} title={previousStatus ? `Move to ${previousStatus}` : 'No previous column'} aria-label={previousStatus ? `Move ${task.title} to the top of ${previousStatus}` : `No previous column available for ${task.title}`}>Move left</button>
        <button type="button" onClick={() => nextStatus && onMoveTaskTo(task.id, nextStatus, 0)} disabled={busy || !nextStatus} title={nextStatus ? `Move to ${nextStatus}` : 'No next column'} aria-label={nextStatus ? `Move ${task.title} to the top of ${nextStatus}` : `No next column available for ${task.title}`}>Move right</button>
      </div>
    </article>
  );
}
