import { useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { isTaskStatus, TASK_STATUS_VALUES } from '../../validation/taskStatus';
import type { TaskTreeNode } from './taskTypes';
import { riskVariantByLevel, taskStatusVariant } from './taskStyleUtils';
import { formatDate, formatValue, isOverdue } from './taskUtils';
import { Badge, Button, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, cn } from '../ui';
import { Check, MoreHorizontal, StickyNote } from '../ui/icons';

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

const gridColumns = 'grid grid-cols-[minmax(16rem,2.4fr)_minmax(7rem,1fr)_minmax(7.5rem,1fr)_minmax(5.5rem,0.8fr)_minmax(5.5rem,0.8fr)_minmax(7rem,1fr)_minmax(9rem,auto)] items-center gap-x-3';

function getSubtaskProgress(task: TaskTreeNode) {
  const total = task.subtaskCount ?? task.subtaskIds?.length ?? task.subtasks.length;
  const completed = task.completedSubtaskCount ?? task.subtasks.filter((subtask) => subtask.status === 'DONE').length;
  const percent = total > 0 ? task.subtaskProgressPercent ?? Math.round((completed * 100) / total) : 0;

  return { completed, percent, total };
}

const getTaskNoteCount = (task: TaskTreeNode) => task.noteCount ?? task.notesCount;

const taskNotesHref = (taskId: number) => `/notes?taskId=${encodeURIComponent(String(taskId))}`;

function SubtaskProgress({ task }: { task: TaskTreeNode }) {
  const { completed, percent, total } = getSubtaskProgress(task);

  if (total === 0) return <span className="text-xs text-fg-subtle">No subtasks</span>;

  return (
    <div className="flex min-w-24 flex-col gap-1" aria-label={`${completed} of ${total} subtasks complete`}>
      <div className="flex justify-between text-[11px] text-fg-muted tabular-nums">
        <span>{completed}/{total}</span>
        <span>{percent}%</span>
      </div>
      <span className="h-1 w-full overflow-hidden rounded-full bg-inset" aria-hidden="true">
        <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
      </span>
    </div>
  );
}

function NestedSubtaskList({ subtasks }: { subtasks: TaskTreeNode[] }) {
  if (subtasks.length === 0) return <p className="text-sm text-fg-subtle">No subtasks.</p>;

  return (
    <ul className="flex flex-col gap-2 border-l border-line pl-3">
      {subtasks.map((subtask) => {
        const overdue = isOverdue(subtask);
        const nestedProgress = getSubtaskProgress(subtask);

        return (
          <li key={subtask.id} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-fg">#{subtask.id} {subtask.title}</span>
              <Badge variant={taskStatusVariant(subtask.status)}>{subtask.status ?? 'No status'}</Badge>
              <span className={cn('text-xs', overdue ? 'font-medium text-critical' : 'text-fg-muted')}>{formatDate(subtask.dueDate)}</span>
              {nestedProgress.total > 0 ? <span className="text-xs text-fg-subtle">{nestedProgress.completed}/{nestedProgress.total} subtasks</span> : null}
            </div>
            {subtask.description ? <p className="text-sm text-fg-muted">{subtask.description}</p> : null}
            {subtask.subtasks.length > 0 ? <NestedSubtaskList subtasks={subtask.subtasks} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

function DetailSection({ id, title, action, children }: { id: string; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h4 id={id} className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

function TaskListItem({ task, busy, onComplete, onStartSubtask, onChangeStatus, onSnoozeFollowUp, onRemoveDependency, onManageDependencies, onDelete, expanded, onToggleExpanded }: TaskListViewProps & { task: TaskTreeNode; expanded: boolean; onToggleExpanded: () => void }) {
  const overdue = isOverdue(task);
  const detailsId = `task-${task.id}-details`;
  const descriptionPreviewId = task.description ? `task-${task.id}-description-preview` : undefined;
  const isDone = task.status === 'DONE' || Boolean(task.completedDate);
  const statusOptions = TASK_STATUS_VALUES.filter((status) => status !== task.status);
  const noteCount = getTaskNoteCount(task);
  const notesLabel = noteCount == null ? 'Notes' : `Notes (${noteCount})`;
  const notesTitle = noteCount == null ? `View notes linked to ${task.title}` : `View ${noteCount} ${noteCount === 1 ? 'note' : 'notes'} linked to ${task.title}`;

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
    <div
      className={cn(
        'border-b border-line last:border-0',
        task.important && 'border-l-2 border-l-caution',
        overdue && 'border-l-2 border-l-critical',
      )}
      role="row"
    >
      <div
        className={cn(gridColumns, 'group cursor-pointer px-4 py-2.5 transition-colors duration-(--duration-fast) hover:bg-inset/40')}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={detailsId}
        aria-describedby={descriptionPreviewId}
        onClick={onToggleExpanded}
        onKeyDown={handleCompactRowKeyDown}
      >
        <div className="flex min-w-0 items-center gap-2" role="cell" data-label="Task">
          <span className="shrink-0 text-xs text-fg-subtle tabular-nums">#{task.id}</span>
          <Link
            to={`/tasks/${task.id}`}
            className="min-w-0 flex-1 truncate text-sm font-medium text-fg hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {task.title}
          </Link>
          {task.important ? <Badge variant="caution">Important</Badge> : null}
          <a
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-fg-muted opacity-0 transition-opacity duration-(--duration-fast) group-hover:opacity-100 hover:bg-inset hover:text-fg focus-visible:opacity-100"
            href={taskNotesHref(task.id)}
            title={notesTitle}
            aria-label={notesTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <StickyNote className="h-3.5 w-3.5" aria-hidden />
            <span>{notesLabel}</span>
          </a>
          {task.description ? (
            <span id={descriptionPreviewId} className="sr-only" role="tooltip">
              {task.description}
            </span>
          ) : null}
        </div>
        <div role="cell" data-label="Status"><Badge variant={taskStatusVariant(task.status)}>{task.status ?? 'No status'}</Badge></div>
        <div className="flex flex-wrap items-center gap-1.5" role="cell" data-label="Due date">
          <span className={cn('text-sm', overdue ? 'font-medium text-critical' : 'text-fg-muted')}>{formatDate(task.dueDate)}</span>
          {overdue ? <Badge variant="critical">Overdue</Badge> : null}
        </div>
        <div className="text-sm text-fg-muted tabular-nums" role="cell" data-label="Estimate">{formatValue(task.estimatedMinutes)}</div>
        <div role="cell" data-label="Risk">
          <Badge variant={riskVariantByLevel[task.riskLevel ?? ''] ?? 'neutral'}>{formatValue(task.riskLevel)}</Badge>
        </div>
        <div role="cell" data-label="Subtasks"><SubtaskProgress task={task} /></div>
        <div
          className="flex items-center justify-end gap-1.5"
          role="cell"
          data-label="Actions"
          onClick={(event) => event.stopPropagation()}
        >
          {isDone ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-positive" aria-label={`Task #${task.id} is completed`}>
              <Check className="h-3.5 w-3.5" aria-hidden />
              Completed
            </span>
          ) : (
            <Button size="sm" onClick={() => onComplete(task.id)} disabled={busy}>Complete</Button>
          )}
          <Menu>
            <MenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={`More actions for #${task.id}`}
                disabled={busy}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </Button>
            </MenuTrigger>
            <MenuContent aria-label={`More actions for #${task.id}`}>
              <MenuItem asChild>
                <Link to={`/tasks/${task.id}`}>Edit</Link>
              </MenuItem>
              <MenuItem onSelect={() => onStartSubtask(task)} disabled={busy}>Add subtask</MenuItem>
              <MenuItem asChild>
                <a href={taskNotesHref(task.id)}>{notesLabel}</a>
              </MenuItem>
              <MenuItem onSelect={() => onSnoozeFollowUp(task)} disabled={busy}>Follow up tomorrow</MenuItem>
              <MenuSeparator />
              <MenuLabel>Change status</MenuLabel>
              {statusOptions.map((status) => (
                <MenuItem
                  key={`${task.id}-${status}`}
                  disabled={busy}
                  onSelect={() => {
                    if (isTaskStatus(status)) onChangeStatus(task.id, status);
                  }}
                >
                  {status}
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem destructive onSelect={() => onDelete(task.id)} disabled={busy}>Delete</MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>
      {expanded ? (
        <div id={detailsId} className="border-t border-line bg-inset/30 px-4 py-4">
          <div className="grid gap-5 md:grid-cols-2">
            <DetailSection id={`task-${task.id}-description-heading`} title="Description">
              {task.description ? <p className="text-sm text-fg">{task.description}</p> : <p className="text-sm text-fg-subtle">No description.</p>}
            </DetailSection>

            <DetailSection id={`task-${task.id}-subtasks-heading`} title="Subtasks">
              <NestedSubtaskList subtasks={task.subtasks} />
            </DetailSection>

            <DetailSection
              id={`task-${task.id}-notes-heading`}
              title="Linked notes"
              action={<a className="text-sm font-medium text-brand hover:underline" href={taskNotesHref(task.id)}>{notesLabel}</a>}
            >
              <p className="text-sm text-fg-subtle">Open the linked notes panel to jump into notes connected by task IDs, @task mentions, /task commands, or converted note selections.</p>
            </DetailSection>

            <DetailSection
              id={`task-${task.id}-dependencies-heading`}
              title="Dependencies"
              action={<Button size="sm" variant="ghost" onClick={() => onManageDependencies(task)} disabled={busy}>Manage dependencies</Button>}
            >
              <dl className="flex flex-col gap-1 text-sm">
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-fg-muted">Blocked by</dt><dd className="text-fg">{task.dependencyIds?.map((id) => `#${id}`).join(', ') || '—'}</dd></div>
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-fg-muted">Blocks</dt><dd className="text-fg">{task.blockingTaskIds?.map((id) => `#${id}`).join(', ') || '—'}</dd></div>
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-fg-muted">Waiting on</dt><dd className="text-fg">{formatValue(task.waitingOn ?? task.blockedReason)}</dd></div>
              </dl>
              {task.dependencyIds?.length ? (
                <div className="flex flex-wrap gap-1.5" aria-label={`Dependency actions for ${task.title}`}>
                  {task.dependencyIds.map((blocksTaskId) => (
                    <Button key={`${task.id}-${blocksTaskId}`} size="sm" onClick={() => onRemoveDependency(task.id, blocksTaskId)} disabled={busy}>
                      Unlink #{blocksTaskId}
                    </Button>
                  ))}
                </div>
              ) : null}
            </DetailSection>

            <DetailSection id={`task-${task.id}-activity-heading`} title="Activity">
              {activityItems.length ? (
                <dl className="flex flex-col gap-1 text-sm">
                  {activityItems.map((item) => (
                    <div key={`${task.id}-${item.label}`} className="flex gap-2">
                      <dt className="w-24 shrink-0 text-fg-muted">{item.label}</dt>
                      <dd className="text-fg">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : <p className="text-sm text-fg-subtle">No recent activity.</p>}
            </DetailSection>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TaskListView(props: TaskListViewProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card shadow-2xs">
      <div className="min-w-4xl" role="table" aria-label="Task list">
        <div className={cn(gridColumns, 'border-b border-line bg-inset/60 px-4 py-2')} role="row">
          <span className="text-xs font-semibold tracking-wide text-fg-muted uppercase" role="columnheader">Task</span>
          <span className="text-xs font-semibold tracking-wide text-fg-muted uppercase" role="columnheader">Status</span>
          <span className="text-xs font-semibold tracking-wide text-fg-muted uppercase" role="columnheader">Due</span>
          <span className="text-xs font-semibold tracking-wide text-fg-muted uppercase" role="columnheader">Estimate</span>
          <span className="text-xs font-semibold tracking-wide text-fg-muted uppercase" role="columnheader">Risk</span>
          <span className="text-xs font-semibold tracking-wide text-fg-muted uppercase" role="columnheader">Subtasks</span>
          <span className="text-right text-xs font-semibold tracking-wide text-fg-muted uppercase" role="columnheader">Actions</span>
        </div>
        <div role="rowgroup">
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
