import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
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

interface TaskMetaItemProps {
  label: string;
  children: ReactNode;
}

interface IconButtonProps {
  icon: ReactNode;
  label: string;
  title?: string;
  disabled?: boolean;
  href?: string;
  as?: 'button' | 'summary';
  onClick?: () => void;
}

function IconButton({ icon, label, title = label, disabled, href, as = 'button', onClick }: IconButtonProps) {
  const content = <span aria-hidden="true">{icon}</span>;

  if (href) {
    return (
      <a className={styles.iconButton} href={href} title={title} aria-label={label}>
        {content}
      </a>
    );
  }

  if (as === 'summary') {
    return (
      <summary className={styles.iconButton} title={title} aria-label={label}>
        {content}
      </summary>
    );
  }

  return (
    <button type="button" className={styles.iconButton} onClick={onClick} disabled={disabled} title={title} aria-label={label}>
      {content}
    </button>
  );
}

function TaskMetaItem({ label, children }: TaskMetaItemProps) {
  return (
    <div className={styles.metaItem}>
      <dt className={styles.metaLabel}>{label}</dt>
      <dd className={styles.metaValue}>{children}</dd>
    </div>
  );
}

type TaskMetadataFields = TaskTreeNode & {
  assignee?: string | number | boolean | null;
  estimate?: string | number | boolean | null;
  estimatePoints?: string | number | boolean | null;
  estimatedPoints?: string | number | boolean | null;
  points?: string | number | boolean | null;
  storyPoints?: string | number | boolean | null;
};

const getEstimateValue = (task: TaskMetadataFields) => task.estimatePoints ?? task.estimate ?? task.estimatedPoints ?? task.points ?? task.storyPoints ?? task.estimatedMinutes;

const formatMetadataValue = (value?: string | number | boolean | null) => value === 0 ? '0' : formatValue(value);

const isSubtaskComplete = (subtask: TaskTreeNode) => subtask.status === 'DONE' || Boolean(subtask.completedDate);

const formatAssigneeInitial = (assignee: string | number | boolean | null | undefined) => {
  const value = formatValue(assignee);
  return value === '—' ? '?' : value.trim().charAt(0).toUpperCase();
};

const formatTaskKey = (taskId: number) => `TAS-${String(taskId).padStart(3, '0')}`;

const formatDependencySummary = (task: TaskTreeNode) => {
  const values: string[] = [];

  if (task.parentTaskId) values.push(`Parent ${formatTaskKey(task.parentTaskId)}`);

  const dependencyIds = task.dependencyIds ?? [];
  if (dependencyIds.length > 0) {
    values.push(`Blocked by ${formatTaskKey(dependencyIds[0])}${dependencyIds.length > 1 ? ` +${dependencyIds.length - 1}` : ''}`);
  }

  const blockingTaskIds = task.blockingTaskIds ?? [];
  if (blockingTaskIds.length > 0) {
    values.push(`Blocks ${formatTaskKey(blockingTaskIds[0])}${blockingTaskIds.length > 1 ? ` +${blockingTaskIds.length - 1}` : ''}`);
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
  const metadataTask = task as TaskMetadataFields;
  const assignee = metadataTask.assignee;
  const estimate = getEstimateValue(metadataTask);
  const status = task.status ?? columnStatus;
  const taskKey = formatTaskKey(task.id);
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
          {task.important ? (
            <div className={styles.cardTopActions}>
              <span className={styles.bookmarkIcon} title="Bookmarked important task" aria-label="Bookmarked important task">★</span>
            </div>
          ) : null}
        </div>
        {task.description ? <p className={styles.description}>{task.description}</p> : null}
      </div>

      <div className={styles.badgeRow} aria-label={`Task badges for ${task.title}`}>
        <span className={taskStatusClassName(status)}>{formatValue(status)}</span>
        <span className={effortBadgeClasses}>{primaryEffortBadge}</span>
        {task.priorityScore != null && task.effort ? <span className={styles.scoreBadge}>Priority {formatValue(task.priorityScore)}</span> : null}
      </div>

      <dl className={styles.infoGrid}>
        <TaskMetaItem label="Due date">
          <span className={styles.metaStack}>
            <span className={overdue ? styles.dateOverdue : undefined}>{formatDate(task.dueDate)}</span>
            {overdue ? <span className={styles.overdueHint}>Overdue</span> : null}
          </span>
        </TaskMetaItem>
        <TaskMetaItem label="Assignee">
          <span className={styles.assigneeAvatar} aria-hidden="true">{formatAssigneeInitial(assignee)}</span>
          <span>{formatValue(assignee)}</span>
        </TaskMetaItem>
      </dl>

      <dl className={styles.metadataGrid}>
        <TaskMetaItem label="Estimate">{formatMetadataValue(estimate)}</TaskMetaItem>
        <TaskMetaItem label="Effort">{formatValue(task.effort)}</TaskMetaItem>
        <TaskMetaItem label="Area">{formatValue(task.area)}</TaskMetaItem>
        <TaskMetaItem label="Track">{formatValue(task.track)}</TaskMetaItem>
        <TaskMetaItem label="Score">{formatMetadataValue(task.priorityScore)}</TaskMetaItem>
      </dl>

      <div className={styles.dependencyRow} aria-label={`Dependencies for ${task.title}: ${dependencySummary}`}>
        <span className={styles.dependencyContent}>
          <span className={styles.dependencyLabel}>Dependencies</span>
          <span className={styles.dependencyValue}>{dependencySummary}</span>
        </span>
        <span className={styles.dependencyChevron} aria-hidden="true">›</span>
      </div>

      <section className={styles.subtaskProgress} aria-label={`Subtask progress for ${task.title}`}>
        <div className={styles.subtaskProgressHeader}>
          <span className={styles.subtaskProgressCount}>{completedSubtaskCount} / {subtaskTotal} completed</span>
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
            <ul className={styles.subtaskList} aria-label={`All subtasks for ${task.title}`}>
              {task.subtasks.map((subtask) => {
                const complete = isSubtaskComplete(subtask);
                return (
                  <li key={subtask.id} className={complete ? styles.subtaskListItemComplete : styles.subtaskListItem}>
                    <span className={styles.subtaskCheckIcon} aria-hidden="true">{complete ? '✓' : ''}</span>
                    <span className={styles.subtaskListContent}>
                      <span className={styles.subtaskListTitle}>#{subtask.id} {subtask.title}</span>
                      <span className={styles.subtaskListMeta}>{formatValue(subtask.status ?? 'No status')}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
        ) : <span className={styles.subtaskDetailsSummary} aria-disabled="true">View all subtasks (0)</span>}
      </section>

      <div className={styles.cardToolbar} role="toolbar" aria-label={`Task actions for ${task.title}`}>
        <IconButton
          icon="＋"
          label={`Add subtask to ${task.title}`}
          title="Add subtask"
          onClick={() => onStartSubtask(task)}
          disabled={busy}
        />
        <IconButton
          icon="💬"
          label={`Comments are not available for ${task.title}`}
          title="Comments are not available from this card"
          disabled
        />
        <IconButton
          icon="📎"
          label={`Attachments are not available for ${task.title}`}
          title="Attachments are not available from this card"
          disabled
        />
        <IconButton
          icon="🔗"
          label={`Open dependency link panel for ${task.title}`}
          title="Open dependency link panel"
          href="#dependency-links-title"
        />
        <details className={`${styles.secondaryMenu} ${styles.toolbarOverflow}`}>
          <IconButton
            as="summary"
            icon="…"
            label={`Open more actions for ${task.title}`}
            title="Open more task actions"
          />
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
            <button type="button" onClick={() => { setDraftTitle(task.title); setIsEditingTitle(true); }} disabled={busy} title="Edit title">Edit title</button>
            <button type="button" onClick={() => onComplete(task.id)} disabled={busy} title="Complete task">Complete</button>
            <button type="button" onClick={() => onMoveTaskTo(task.id, columnStatus, index - 1)} disabled={!canMoveUp} title="Move before the previous card">Move up</button>
            <button type="button" onClick={() => onMoveTaskTo(task.id, columnStatus, index + 1)} disabled={!canMoveDown} title="Move after the next card">Move down</button>
            <button type="button" onClick={() => previousStatus && onMoveTaskTo(task.id, previousStatus, 0)} disabled={busy || !previousStatus} title={previousStatus ? `Move to ${previousStatus}` : 'No previous column'}>{previousStatus ? `Move to ${previousStatus}` : 'No previous column'}</button>
            <button type="button" onClick={() => nextStatus && onMoveTaskTo(task.id, nextStatus, 0)} disabled={busy || !nextStatus} title={nextStatus ? `Move to ${nextStatus}` : 'No next column'}>{nextStatus ? `Move to ${nextStatus}` : 'No next column'}</button>
            {task.dependencyIds?.map((blocksTaskId) => <button key={`${task.id}-${blocksTaskId}`} type="button" onClick={() => onRemoveDependency(task.id, blocksTaskId)} disabled={busy} title={`Remove dependency on task ${blocksTaskId}`}>Unlink #{blocksTaskId}</button>)}
            <button type="button" onClick={() => onDelete(task.id)} disabled={busy} title="Delete task">Delete</button>
          </div>
        </details>
      </div>
      </article>
    </div>
  );
}
