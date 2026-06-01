import { isTaskStatus, TASK_STATUS_VALUES } from '../../validation/taskStatus';
import type { TaskTreeNode } from './taskTypes';
import { taskStatusClassName } from './taskStyleUtils';
import styles from './TaskListView.module.css';
import cardStyles from './TaskCard.module.css';
import { formatDate, formatValue, isOverdue, renderDueDate, subtaskSummary } from './taskUtils';

interface TaskListViewProps {
  tasks: TaskTreeNode[];
  busy: boolean;
  onComplete: (taskId: number) => void;
  onStartSubtask: (task: TaskTreeNode) => void;
  onChangeStatus: (taskId: number, status: string) => void;
  onSnoozeFollowUp: (task: TaskTreeNode) => void;
  onRemoveDependency: (taskId: number, blocksTaskId: number) => void;
  onDelete: (taskId: number) => void;
}

function TaskListItem({ task, depth = 0, busy, onComplete, onStartSubtask, onChangeStatus, onSnoozeFollowUp, onRemoveDependency, onDelete }: TaskListViewProps & { task: TaskTreeNode; depth?: number }) {
  const overdue = isOverdue(task);
  const summary = subtaskSummary(task);

  return (
    <article className={[styles.card, task.important ? cardStyles.rowImportant : '', overdue ? cardStyles.rowOverdue : ''].filter(Boolean).join(' ')} style={{ marginLeft: depth ? `${depth * 1.25}rem` : undefined }}>
      <div className={styles.primary}>
        <span className={styles.id}>#{task.id}</span>
        <div>
          <div className={cardStyles.title}>
            <strong>{task.title}</strong>
            {task.important && <span className={cardStyles.importantPill}>Important</span>}
          </div>
          {task.description && <p className={cardStyles.description}>{task.description}</p>}
          {summary && <p className={cardStyles.description}>{summary}</p>}
        </div>
      </div>
      <div className={styles.metric} data-label="Status"><span className={taskStatusClassName(task.status)}>{task.status ?? 'No status'}</span></div>
      <div className={styles.metric} data-label="Due date"><span className={overdue ? cardStyles.dateOverdue : ''}>{renderDueDate(task, overdue)}</span></div>
      <div className={styles.metric} data-label="Estimate">{formatValue(task.estimatedMinutes)}</div>
      <div className={styles.metric} data-label="Risk"><span>{formatValue(task.riskLevel)}</span>{task.riskReason ? <p className={cardStyles.description}>{task.riskReason}</p> : null}</div>
      <div className={cardStyles.actions} aria-label={`Actions for ${task.title}`}>
        <button type="button" onClick={() => onComplete(task.id)} disabled={busy}>Complete</button>
        <button type="button" onClick={() => onStartSubtask(task)} disabled={busy}>Add subtask</button>
        <label htmlFor={`changeStatus-${task.id}`} className="sr-only">Set status</label>
        <select id={`changeStatus-${task.id}`} disabled={busy} defaultValue="" onChange={(e) => { if (e.target.value && isTaskStatus(e.target.value)) onChangeStatus(task.id, e.target.value); }}>
          <option value="">Set status...</option>
          {TASK_STATUS_VALUES.map((s) => <option key={`${task.id}-${s}`} value={s}>{s}</option>)}
        </select>
        <button type="button" onClick={() => onSnoozeFollowUp(task)} disabled={busy}>Follow up tomorrow</button>
        {task.dependencyIds?.map((blocksTaskId) => <button key={`${task.id}-${blocksTaskId}`} type="button" onClick={() => onRemoveDependency(task.id, blocksTaskId)} disabled={busy}>Unlink #{blocksTaskId}</button>)}
        <button type="button" onClick={() => onDelete(task.id)} disabled={busy}>Delete</button>
      </div>
      <details className={styles.details}>
        <summary>More details</summary>
        <dl className={styles.detailGrid}>
          <div><dt>Start date</dt><dd>{formatDate(task.startDate)}</dd></div>
          <div><dt>Actual</dt><dd>{formatValue(task.actualMinutes)}</dd></div>
          <div><dt>Track</dt><dd>{formatValue(task.track)}</dd></div>
          <div><dt>Phase</dt><dd>{formatValue(task.phase)}</dd></div>
          <div><dt>Parent</dt><dd>{task.parentTaskId ? `#${task.parentTaskId}` : '—'}</dd></div>
          <div><dt>Area</dt><dd>{formatValue(task.area)}</dd></div>
          <div><dt>Effort</dt><dd>{formatValue(task.effort)}</dd></div>
          <div><dt>Waiting on</dt><dd>{formatValue(task.waitingOn ?? task.blockedReason)}</dd></div>
          <div><dt>Blocked by</dt><dd>{task.dependencyIds?.map((id) => `#${id}`).join(', ') || '—'}</dd></div>
          <div><dt>Blocks</dt><dd>{task.blockingTaskIds?.map((id) => `#${id}`).join(', ') || '—'}</dd></div>
          <div><dt>Follow-up</dt><dd>{formatDate(task.followUpDate)}</dd></div>
        </dl>
      </details>
      {task.subtasks.length > 0 && <div className={styles.subtaskList}>{task.subtasks.map((subtask) => <TaskListItem key={subtask.id} task={subtask} depth={depth + 1} tasks={[]} busy={busy} onComplete={onComplete} onStartSubtask={onStartSubtask} onChangeStatus={onChangeStatus} onSnoozeFollowUp={onSnoozeFollowUp} onRemoveDependency={onRemoveDependency} onDelete={onDelete} />)}</div>}
    </article>
  );
}

export function TaskListView(props: TaskListViewProps) {
  return (
    <div className={styles.tableShell}>
      <div className={styles.table} aria-label="Task list">
        <div className={styles.header}>
          <span>Task</span>
          <span>Status</span>
          <span>Due</span>
          <span>Estimate</span>
          <span>Risk</span>
          <span>Actions</span>
        </div>
        <div className={styles.body}>
          {props.tasks.map((task) => <TaskListItem key={task.id} {...props} task={task} />)}
        </div>
      </div>
    </div>
  );
}
