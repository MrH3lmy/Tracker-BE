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

const formatAssigneeInitial = (assignee: string | number | boolean | null | undefined) => {
  const value = formatValue(assignee);
  return value === '—' ? '?' : value.trim().charAt(0).toUpperCase();
};

const formatDependencySummary = (task: TaskTreeNode) => {
  const values: string[] = [];

  if (task.parentTaskId) values.push(`Parent #${task.parentTaskId}`);

  const dependencyIds = task.dependencyIds ?? [];
  if (dependencyIds.length > 0) {
    values.push(`Blocked by #${dependencyIds[0]}${dependencyIds.length > 1 ? ` +${dependencyIds.length - 1}` : ''}`);
  }

  const blockingTaskIds = task.blockingTaskIds ?? [];
  if (blockingTaskIds.length > 0) {
    values.push(`Blocks #${blockingTaskIds[0]}${blockingTaskIds.length > 1 ? ` +${blockingTaskIds.length - 1}` : ''}`);
  }

  return values.join(' · ');
};

export function TaskCard({ task, columnStatus, previousStatus, nextStatus, index, columnTaskCount, depth = 0, busy, draggingTaskId, onDragStart, onDragOver, onDragEnd, onDrop, onMoveTaskTo, onStartSubtask, onComplete, onChangeStatus, onUpdateTask, onSnoozeFollowUp, onRemoveDependency, onDelete }: TaskCardProps) {
  const overdue = isOverdue(task);
  const subtaskTotal = task.subtaskCount ?? task.subtaskIds?.length ?? task.subtasks.length;
  const completedSubtaskCount = task.completedSubtaskCount ?? task.subtasks.filter(isSubtaskComplete).length;
  const subtaskProgressPercent = subtaskTotal > 0 ? task.subtaskProgressPercent ?? Math.round((completedSubtaskCount * 100) / subtaskTotal) : 0;
  const summary = subtaskSummary({ ...task, subtaskCount: subtaskTotal, completedSubtaskCount, subtaskProgressPercent });
  const previewSubtasks = task.subtasks.slice(0, subtaskPreviewLimit);
  const isDragging = draggingTaskId === task.id;
  const cardClasses = [styles.cardShell, styles.card, task.important ? styles.rowImportant : '', overdue ? styles.rowOverdue : '', isDragging ? styles.dragging : ''].filter(Boolean).join(' ');
  const frameClasses = [styles.cardFrame, isDragging ? styles.draggingFrame : ''].filter(Boolean).join(' ');
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
  const taskKey = `TAS-${String(task.id).padStart(3, '0')}`;
  const effortBadgeClasses = [
    styles.effortBadge,
    task.effort === 'MEDIUM' ? styles.effortBadgeMedium : '',
    task.effort === 'HIGH' || task.effort === 'DEEP_WORK' || task.effort === 'LARGE' ? styles.effortBadgeHigh : '',
  ].filter(Boolean).join(' ');
  const hasDependencyRow = Boolean(task.parentTaskId || task.dependencyIds?.length || task.blockingTaskIds?.length);
  const dependencySummary = hasDependencyRow ? formatDependencySummary(task) : 'No dependencies';
  const primaryEffortBadge = task.effort ? `Effort ${formatValue(task.effort)}` : task.priorityScore != null ? `Priority ${formatValue(task.priorityScore)}` : 'No effort set';

  return (
    <div className={frameClasses} style={{ marginLeft: depth ? `${depth * 1.25}rem` : undefined }}>
      <div className={styles.keyboardControls} aria-label={`Keyboard move controls for task ${task.id}`}>
        <button type="button" onClick={() => onMoveTaskTo(task.id, columnStatus, index - 1)} disabled={!canMoveUp} title="Move before the previous card" aria-label={`Move ${task.title} before the previous card in ${columnStatus}`}>↑</button>
        <button type="button" onClick={() => onMoveTaskTo(task.id, columnStatus, index + 1)} disabled={!canMoveDown} title="Move after the next card" aria-label={`Move ${task.title} after the next card in ${columnStatus}`}>↓</button>
        <button type="button" onClick={() => previousStatus && onMoveTaskTo(task.id, previousStatus, 0)} disabled={busy || !previousStatus} title={previousStatus ? `Move to ${previousStatus}` : 'No previous column'} aria-label={previousStatus ? `Move ${task.title} to the top of ${previousStatus}` : `No previous column available for ${task.title}`}>←</button>
        <button type="button" onClick={() => nextStatus && onMoveTaskTo(task.id, nextStatus, 0)} disabled={busy || !nextStatus} title={nextStatus ? `Move to ${nextStatus}` : 'No next column'} aria-label={nextStatus ? `Move ${task.title} to the top of ${nextStatus}` : `No next column available for ${task.title}`}>→</button>
      </div>
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
        tabIndex={0}
        aria-labelledby={titleId}
        aria-describedby={moveHintId}
      >
      <div className={styles.cardHeader}>
        <div className={styles.cardTopSection}>
          <div className={styles.taskIdentity}>
            <span className={styles.taskKey}>{taskKey}</span>
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
              <strong id={titleId} className={styles.cardTitle}>{task.title}</strong>
            )}
          </div>
          <div className={styles.cardTopActions}>
            {task.important ? <span className={styles.bookmarkIcon} title="Bookmarked important task" aria-label="Bookmarked important task">★</span> : null}
            <button type="button" className={styles.compactIconButton} onClick={() => { setDraftTitle(task.title); setIsEditingTitle(true); }} disabled={busy || isEditingTitle} title="Edit title (Enter saves, Esc cancels)" aria-label={`Edit title for ${task.title}`}>✎</button>
          </div>
        </div>
        {task.description ? <p className={styles.description}>{task.description}</p> : null}
      </div>

      <div className={styles.badgeRow} aria-label={`Task badges for ${task.title}`}>
        <span className={taskStatusClassName(status)}>{formatValue(status)}</span>
        <span className={effortBadgeClasses}>{primaryEffortBadge}</span>
        {task.priorityScore != null && task.effort ? <span className={styles.scoreBadge}>Priority {formatValue(task.priorityScore)}</span> : null}
      </div>

      <dl className={styles.importantInfoGrid}>
        <div className={styles.importantInfoItem}>
          <dt>Due date</dt>
          <dd>
            <span className={styles.metaIcon} aria-hidden="true">📅</span>
            <span className={styles.metaStack}>
              <span className={overdue ? styles.dateOverdue : undefined}>{formatDate(task.dueDate)}</span>
              <span className={overdue ? styles.overdueHint : styles.metaSubvalue}>{overdue ? 'Overdue' : `Start ${formatDate(task.startDate)}`}</span>
            </span>
          </dd>
        </div>
        <div className={styles.importantInfoItem}>
          <dt>Assignee</dt>
          <dd>
            <span className={styles.assigneeAvatar} aria-hidden="true">{formatAssigneeInitial(assignee)}</span>
            <span>{formatValue(assignee)}</span>
          </dd>
        </div>
      </dl>

      <dl className={styles.metadataGrid}>
        <div className={styles.metaItem}>
          <dt>Estimate</dt>
          <dd><span className={styles.metaIcon} aria-hidden="true">⏱</span>{formatValue(task.estimatedMinutes)}</dd>
        </div>
        <div className={styles.metaItem}>
          <dt>Effort</dt>
          <dd><span className={styles.metaIcon} aria-hidden="true">⚡</span>{formatValue(task.effort)}</dd>
        </div>
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
      </dl>

      <div className={styles.dependencyRow} aria-label={`Dependencies for ${task.title}: ${dependencySummary}`}>
        <span className={styles.metaIcon} aria-hidden="true">🔗</span>
        <span className={styles.dependencyLabel}>Dependencies</span>
        <span className={styles.dependencyValue}>{dependencySummary}</span>
        <span className={styles.dependencyChevron} aria-hidden="true">›</span>
      </div>

      <section className={styles.subtaskProgress} aria-label={`Subtask progress for ${task.title}`}>
        <div className={styles.subtaskProgressHeader}>
          <span className={styles.subtaskProgressCount}>{completedSubtaskCount}/{subtaskTotal} subtasks</span>
          <span className={styles.subtaskProgressPercent}>{subtaskProgressPercent}%</span>
        </div>
        <div className={styles.subtaskProgressTrack} role="progressbar" aria-valuenow={subtaskProgressPercent} aria-valuemin={0} aria-valuemax={100} aria-label={summary || `No subtasks for ${task.title}`}>
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
        ) : <p className={styles.emptySubtaskPreview}>No subtasks yet</p>}
        {task.subtasks.length > 0 ? (
          <details className={styles.subtaskDetails}>
            <summary className={styles.subtaskDetailsSummary}>View all subtasks ({subtaskTotal})</summary>
            <div className={styles.subtaskList}>
              {task.subtasks.map((subtask, subtaskIndex) => (
                <TaskCard key={subtask.id} task={subtask} columnStatus={columnStatus} previousStatus={previousStatus} nextStatus={nextStatus} index={subtaskIndex} columnTaskCount={task.subtasks.length} depth={depth + 1} busy={busy} draggingTaskId={draggingTaskId} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDrop={onDrop} onMoveTaskTo={onMoveTaskTo} onStartSubtask={onStartSubtask} onComplete={onComplete} onChangeStatus={onChangeStatus} onUpdateTask={onUpdateTask} onSnoozeFollowUp={onSnoozeFollowUp} onRemoveDependency={onRemoveDependency} onDelete={onDelete} />
              ))}
            </div>
          </details>
        ) : <span className={styles.subtaskDetailsSummary} aria-disabled="true">View all subtasks (0)</span>}
      </section>

      <div className={styles.cardToolbar} role="toolbar" aria-label={`Task actions for ${task.title}`}>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => onComplete(task.id)}
          disabled={busy}
          title="Complete task (Tab to reach)"
          aria-label={`Complete ${task.title}`}
        >
          <span aria-hidden="true">✓</span>
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => onStartSubtask(task)}
          disabled={busy}
          title="Add subtask (Tab to reach)"
          aria-label={`Add subtask to ${task.title}`}
        >
          <span aria-hidden="true">＋</span>
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          disabled
          title="Comments and task details are not available from this card"
          aria-label={`Comments and details are not available for ${task.title}`}
        >
          <span aria-hidden="true">💬</span>
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          disabled
          title="Attachments are not available from this card"
          aria-label={`Attachments are not available for ${task.title}`}
        >
          <span aria-hidden="true">📎</span>
        </button>
        <a
          className={styles.toolbarButton}
          href="#dependency-links-title"
          title="Open dependency link panel"
          aria-label={`Open dependency link panel for ${task.title}`}
        >
          <span aria-hidden="true">🔗</span>
        </a>
        <details className={`${styles.secondaryMenu} ${styles.toolbarOverflow}`}>
          <summary className={styles.toolbarButton} title="Open more task actions (Enter/Space)" aria-label={`Open more actions for ${task.title}`}>
            <span aria-hidden="true">…</span>
          </summary>
          <div className={styles.secondaryActions}>
            <label htmlFor={`${statusSelectId}-menu`}>Status</label>
            <select id={`${statusSelectId}-menu`} value={task.status ?? columnStatus} onChange={(event) => onChangeStatus(task.id, event.target.value as TaskStatus)} disabled={busy}>
              {TASK_STATUS_VALUES.map((status) => <option key={`${task.id}-menu-${status}`} value={status}>{status}</option>)}
            </select>
            <button type="button" onClick={() => { setDraftTitle(task.title); setIsEditingTitle(true); }} disabled={busy} title="Edit title">Edit title</button>
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
      </div>
      </article>
    </div>
  );
}
