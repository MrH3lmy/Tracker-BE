import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { isTaskStatus, TASK_STATUS_VALUES } from '../../validation/taskStatus';
import type { TaskTreeNode } from './taskTypes';
import { taskStatusClassName } from './taskStyleUtils';
import styles from './TaskListView.module.css';
import { formatDate, formatValue, isOverdue } from './taskUtils';

interface TaskListViewProps {
  tasks: TaskTreeNode[];
  busy: boolean;
  onComplete: (taskId: number) => void;
  onStartSubtask: (task: TaskTreeNode) => void;
  onChangeStatus: (taskId: number, status: string) => void;
  onSnoozeFollowUp: (task: TaskTreeNode) => void;
  onRemoveDependency: (taskId: number, blocksTaskId: number) => void;
  onManageDependencies: (task: TaskTreeNode) => void;
  onDelete: (taskId: number) => void;
}

function getSubtaskProgress(task: TaskTreeNode) {
  const total = task.subtaskCount ?? task.subtaskIds?.length ?? task.subtasks.length;
  const completed = task.completedSubtaskCount ?? task.subtasks.filter((subtask) => subtask.status === 'DONE').length;
  const percent = total > 0 ? task.subtaskProgressPercent ?? Math.round((completed * 100) / total) : 0;

  return { completed, percent, total };
}

function RiskBadge({ riskLevel }: { riskLevel?: string }) {
  const riskLabel = formatValue(riskLevel);
  const riskClassName = [
    styles.riskBadge,
    riskLevel === 'MEDIUM' ? styles.riskMedium : '',
    riskLevel === 'HIGH' ? styles.riskHigh : '',
    riskLevel === 'CRITICAL' ? styles.riskCritical : '',
  ].filter(Boolean).join(' ');

  return <span className={riskClassName}>{riskLabel}</span>;
}

function SubtaskProgress({ task }: { task: TaskTreeNode }) {
  const { completed, percent, total } = getSubtaskProgress(task);

  if (total === 0) return <span className={styles.emptyProgress}>No subtasks</span>;

  return (
    <div className={styles.progress} aria-label={`${completed} of ${total} subtasks complete`}>
      <div className={styles.progressText}>
        <span>{completed}/{total}</span>
        <span>{percent}%</span>
      </div>
      <span className={styles.progressTrack} aria-hidden="true">
        <span className={styles.progressFill} style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
      </span>
    </div>
  );
}

function NestedSubtaskList({ subtasks }: { subtasks: TaskTreeNode[] }) {
  if (subtasks.length === 0) return <p className={styles.emptyNested}>No subtasks.</p>;

  return (
    <ul className={styles.nestedList}>
      {subtasks.map((subtask) => {
        const overdue = isOverdue(subtask);
        const nestedProgress = getSubtaskProgress(subtask);

        return (
          <li key={subtask.id} className={styles.nestedItem}>
            <div className={styles.nestedSummary}>
              <span className={styles.nestedTitle}>#{subtask.id} {subtask.title}</span>
              <span className={taskStatusClassName(subtask.status)}>{subtask.status ?? 'No status'}</span>
              <span className={overdue ? styles.overdueDate : undefined}>{formatDate(subtask.dueDate)}</span>
              {nestedProgress.total > 0 ? <span className={styles.nestedProgress}>{nestedProgress.completed}/{nestedProgress.total} subtasks</span> : null}
            </div>
            {subtask.description ? <p className={styles.nestedDescription}>{subtask.description}</p> : null}
            {subtask.subtasks.length > 0 ? <NestedSubtaskList subtasks={subtask.subtasks} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

function TaskListItem({ task, busy, onComplete, onStartSubtask, onChangeStatus, onSnoozeFollowUp, onRemoveDependency, onManageDependencies, onDelete, expanded, onToggleExpanded }: TaskListViewProps & { task: TaskTreeNode; expanded: boolean; onToggleExpanded: () => void }) {
  const overdue = isOverdue(task);
  const rowClassName = [styles.row, task.important ? styles.rowImportant : '', overdue ? styles.rowOverdue : ''].filter(Boolean).join(' ');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = `task-${task.id}-actions-menu`;
  const detailsId = `task-${task.id}-details`;

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handleDocumentClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const runMenuAction = (action: () => void) => {
    action();
    setMenuOpen(false);
  };

  const handleCompactRowKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggleExpanded();
    }
  };

  const activityItems = [
    task.followUpDate ? { label: 'Follow-up', value: formatDate(task.followUpDate) } : null,
    task.status ? { label: 'Status', value: task.status } : null,
    task.area ? { label: 'Area', value: formatValue(task.area) } : null,
    task.phase ? { label: 'Phase', value: formatValue(task.phase) } : null,
    task.track ? { label: 'Track', value: formatValue(task.track) } : null,
    task.completedDate ? { label: 'Completed', value: formatDate(task.completedDate) } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  return (
    <div className={rowClassName} role="row">
      <div
        className={styles.compactRow}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={onToggleExpanded}
        onKeyDown={handleCompactRowKeyDown}
      >
        <div className={styles.primary} role="cell" data-label="Task">
          <span className={styles.id}>#{task.id}</span>
          <strong className={styles.title}>{task.title}</strong>
          {task.important ? <span className={styles.importantPill}>Important</span> : null}
        </div>
        <div className={styles.metric} role="cell" data-label="Status"><span className={taskStatusClassName(task.status)}>{task.status ?? 'No status'}</span></div>
        <div className={`${styles.metric} ${styles.dueCell}`} role="cell" data-label="Due date">
          <span className={overdue ? styles.overdueDate : undefined}>{formatDate(task.dueDate)}</span>
          {overdue ? <span className={styles.overdueBadge}>Overdue</span> : null}
        </div>
        <div className={`${styles.metric} ${styles.estimateColumn}`} role="cell" data-label="Estimate">{formatValue(task.estimatedMinutes)}</div>
        <div className={`${styles.metric} ${styles.riskColumn}`} role="cell" data-label="Risk"><RiskBadge riskLevel={task.riskLevel} /></div>
        <div className={styles.metric} role="cell" data-label="Subtasks"><SubtaskProgress task={task} /></div>
        <div
          className={styles.rowActions}
          role="cell"
          data-label="Actions"
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={() => onComplete(task.id)} disabled={busy}>Complete</button>
          <div className={styles.overflow} ref={menuRef}>
            <button
              type="button"
              className={styles.overflowButton}
              aria-label={`More actions for #${task.id}`}
              aria-controls={menuId}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              onClick={() => setMenuOpen((open) => !open)}
              disabled={busy}
            >
              ⋯
            </button>
            {menuOpen ? (
              <div id={menuId} className={styles.overflowMenu} role="group" aria-label={`More actions for #${task.id}`}>
                <button type="button" onClick={() => runMenuAction(() => onStartSubtask(task))} disabled={busy}>Add subtask</button>
                <label htmlFor={`changeStatus-${task.id}`}>Change status</label>
                <select
                  id={`changeStatus-${task.id}`}
                  defaultValue=""
                  disabled={busy}
                  onChange={(e) => {
                    if (e.target.value && isTaskStatus(e.target.value)) runMenuAction(() => onChangeStatus(task.id, e.target.value));
                    e.target.value = '';
                  }}
                >
                  <option value="">Select status...</option>
                  {TASK_STATUS_VALUES.map((s) => <option key={`${task.id}-${s}`} value={s}>{s}</option>)}
                </select>
                <button type="button" onClick={() => runMenuAction(() => onSnoozeFollowUp(task))} disabled={busy}>Follow up tomorrow</button>
                <button type="button" className={styles.dangerAction} onClick={() => runMenuAction(() => onDelete(task.id))} disabled={busy}>Delete</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {expanded ? (
        <div id={detailsId} className={styles.details}>
          <div className={styles.expandedContent}>
            <section className={styles.detailSection} aria-labelledby={`task-${task.id}-description-heading`}>
              <h4 id={`task-${task.id}-description-heading`}>Description</h4>
              {task.description ? <p className={styles.description}>{task.description}</p> : <p className={styles.emptyNested}>No description.</p>}
            </section>

            <section className={styles.detailSection} aria-labelledby={`task-${task.id}-subtasks-heading`}>
              <h4 id={`task-${task.id}-subtasks-heading`}>Subtasks</h4>
              <NestedSubtaskList subtasks={task.subtasks} />
            </section>

            <section className={styles.detailSection} aria-labelledby={`task-${task.id}-dependencies-heading`}>
              <div className={styles.sectionHeader}>
                <h4 id={`task-${task.id}-dependencies-heading`}>Dependencies</h4>
                <button type="button" onClick={() => onManageDependencies(task)} disabled={busy}>Manage dependencies</button>
              </div>
              <dl className={styles.compactMetaList}>
                <div><dt>Blocked by</dt><dd>{task.dependencyIds?.map((id) => `#${id}`).join(', ') || '—'}</dd></div>
                <div><dt>Blocks</dt><dd>{task.blockingTaskIds?.map((id) => `#${id}`).join(', ') || '—'}</dd></div>
                <div><dt>Waiting on</dt><dd>{formatValue(task.waitingOn ?? task.blockedReason)}</dd></div>
              </dl>
              {task.dependencyIds?.length ? (
                <div className={styles.actions} aria-label={`Dependency actions for ${task.title}`}>
                  {task.dependencyIds.map((blocksTaskId) => <button key={`${task.id}-${blocksTaskId}`} type="button" onClick={() => onRemoveDependency(task.id, blocksTaskId)} disabled={busy}>Unlink #{blocksTaskId}</button>)}
                </div>
              ) : null}
            </section>

            <section className={styles.detailSection} aria-labelledby={`task-${task.id}-activity-heading`}>
              <h4 id={`task-${task.id}-activity-heading`}>Activity</h4>
              {activityItems.length ? (
                <dl className={styles.compactMetaList}>
                  {activityItems.map((item) => <div key={`${task.id}-${item.label}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
                </dl>
              ) : <p className={styles.emptyNested}>No recent activity.</p>}
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TaskListView(props: TaskListViewProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  return (
    <div className={styles.tableShell}>
      <div className={styles.table} role="table" aria-label="Task list">
        <div className={styles.header} role="row">
          <span role="columnheader">Task</span>
          <span role="columnheader">Status</span>
          <span role="columnheader">Due</span>
          <span className={styles.estimateColumn} role="columnheader">Estimate</span>
          <span className={styles.riskColumn} role="columnheader">Risk</span>
          <span role="columnheader">Subtasks</span>
          <span role="columnheader">Actions</span>
        </div>
        <div className={styles.body} role="rowgroup">
          {props.tasks.map((task) => (
            <TaskListItem
              key={task.id}
              {...props}
              task={task}
              expanded={expandedTaskId === task.id}
              onToggleExpanded={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
