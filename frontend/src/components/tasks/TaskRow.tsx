import { memo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { isTaskStatus, TASK_STATUS_VALUES } from '../../validation/taskStatus';
import { formatEnumLabel } from '../../lib/enumLabels';
import { Badge, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, cn } from '../ui';
import { CheckCircle2, Circle, FolderKanban, MoreHorizontal, StickyNote, Timer } from '../ui/icons';
import { BlockerSummary } from './BlockerSummary';
import { TaskStateChip } from './TaskStateChip';
import { WORK_STATE_LABEL, taskWorkState } from './taskLenses';
import { riskVariantByLevel, taskStatusVariant } from './taskStyleUtils';
import { formatDate, formatMinutes, isOverdue } from './taskUtils';
import type { TaskTreeNode } from './taskTypes';

export interface TaskRowActions {
  busy: boolean;
  onComplete: (taskId: number) => void;
  onStartSubtask: (task: TaskTreeNode) => void;
  onChangeStatus: (taskId: number, status: string) => void;
  onSnoozeFollowUp: (task: TaskTreeNode) => void;
  onManageDependencies: (task: TaskTreeNode) => void;
  onDelete: (taskId: number) => void;
  onStartFocusSession?: (task: TaskTreeNode) => void;
}

export interface TaskRowProps extends TaskRowActions {
  task: TaskTreeNode;
  depth: number;
  projectName?: string;
  /** Nested subtask list, rendered inside this row's `<li>` so the hierarchy stays valid markup. */
  children?: ReactNode;
}

const taskNotesHref = (taskId: number) => `/notes?taskId=${encodeURIComponent(String(taskId))}`;

const subtaskProgress = (task: TaskTreeNode) => {
  const total = task.subtaskCount ?? task.subtaskIds?.length ?? task.subtasks.length;
  if (total === 0) return null;
  const completed = task.completedSubtaskCount ?? task.subtasks.filter((subtask) => subtask.status === 'DONE').length;
  const percent = task.subtaskProgressPercent ?? Math.round((completed * 100) / total);
  return { completed, total, percent: Math.min(Math.max(percent, 0), 100) };
};

/** Meta item: no icons, no `—` placeholders. A field with no value renders nothing at all. */
function Meta({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('inline-flex min-w-0 items-center gap-1', className)}>{children}</span>;
}

/**
 * One row, every breakpoint. Secondary metadata is revealed with `hidden sm:` / `hidden lg:`
 * visibility utilities rather than by swapping in a separate mobile card component - the skill's
 * `html-tailwind` "Hidden/shown utilities" rule explicitly rejects separate mobile/desktop
 * components, and it is what removes the old page's horizontal scrolling.
 *
 * See design-system/tracker-be/pages/tasks-workspace.md §5.
 */
function TaskRowImpl({ task, depth, projectName, children, busy, onComplete, onStartSubtask, onChangeStatus, onSnoozeFollowUp, onManageDependencies, onDelete, onStartFocusSession }: TaskRowProps) {
  const overdue = isOverdue(task);
  const workState = taskWorkState(task);
  const isDone = task.status === 'DONE' || Boolean(task.completedDate);
  const progress = subtaskProgress(task);
  const estimate = formatMinutes(task.estimatedMinutes);
  const noteCount = task.noteCount ?? task.notesCount;
  const statusLabel = formatEnumLabel(task.status);
  // The workflow status and the work state are different axes, but when they resolve to the same
  // word (a WAITING task that is also in the Waiting work state) printing both is pure noise.
  const showStatus = Boolean(task.status) && task.status !== 'NOT_STARTED' && statusLabel !== WORK_STATE_LABEL[workState];
  const highRisk = task.riskLevel === 'HIGH' || task.riskLevel === 'CRITICAL';
  const blockers = task.blocked ? task.blockers ?? [] : [];
  const statusOptions = TASK_STATUS_VALUES.filter((status) => status !== task.status);

  return (
    <li>
      <div
        className={cn(
          'flex items-start gap-2 px-2 py-2.5 transition-colors duration-(--duration-fast) hover:bg-inset/50 sm:gap-3 sm:px-3',
          depth > 0 && 'border-l-2 border-line',
        )}
        style={depth > 0 ? { marginInlineStart: `${Math.min(depth, 3) * 0.75}rem` } : undefined}
      >
        <button
          type="button"
          onClick={() => onComplete(task.id)}
          disabled={busy || isDone}
          aria-label={isDone ? `Task ${task.title} is completed` : `Complete ${task.title}`}
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-subtle transition-colors duration-(--duration-fast) hover:bg-inset hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-default disabled:hover:bg-transparent sm:h-8 sm:w-8"
        >
          {isDone
            ? <CheckCircle2 className="h-5 w-5 text-positive" aria-hidden />
            : <Circle className="h-5 w-5" aria-hidden />}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              to={`/tasks/${task.id}`}
              className={cn(
                'line-clamp-2 min-w-0 rounded-sm text-sm font-medium wrap-anywhere text-fg hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                isDone && 'text-fg-muted line-through',
              )}
            >
              {task.title}
            </Link>
            {!isDone && <TaskStateChip state={workState} />}
            {overdue && <Badge variant="critical">Overdue</Badge>}
            {task.important && <Badge variant="caution">Important</Badge>}
          </div>

          {task.description && (
            <div className="hidden sm:block">
              <p className="line-clamp-1 text-xs text-fg-subtle">{task.description}</p>
            </div>
          )}

          {/*
            Visibility is controlled by `hidden sm:contents` wrappers rather than by putting
            `hidden` on the items themselves: `hidden`, `inline-flex` and `line-clamp-*` all set
            `display`, so stacking them on one element makes the outcome depend on stylesheet
            order. The wrapper owns display; the item keeps its own.
          */}
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
            <Meta className="shrink-0 font-mono text-fg-subtle">#{task.id}</Meta>
            {projectName && (
              <Meta className="max-w-[10rem]">
                <FolderKanban className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate" aria-hidden>{projectName}</span>
                <span className="sr-only">Project: {projectName}</span>
              </Meta>
            )}
            {task.dueDate && (
              <Meta className={cn('font-mono', overdue && 'font-semibold text-critical')}>
                Due {formatDate(task.dueDate)}
              </Meta>
            )}
            {highRisk && <Badge variant={riskVariantByLevel[task.riskLevel ?? ''] ?? 'neutral'}>{formatEnumLabel(task.riskLevel)} risk</Badge>}
            <span className="hidden sm:contents">
              {showStatus && <Badge variant={taskStatusVariant(task.status)}>{statusLabel}</Badge>}
              {progress && (
                <Meta>
                  <span className="font-mono tabular-nums">{progress.completed}/{progress.total}</span>
                  <span>subtasks</span>
                  <span className="ms-1 h-1 w-10 overflow-hidden rounded-full bg-inset" aria-hidden>
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${progress.percent}%` }} />
                  </span>
                </Meta>
              )}
              {estimate && <Meta className="font-mono">{estimate}</Meta>}
            </span>
            <span className="hidden lg:contents">
              {task.effort && <Meta>{formatEnumLabel(task.effort)}</Meta>}
              {task.followUpDate && <Meta className="font-mono">Follow-up {formatDate(task.followUpDate)}</Meta>}
              {task.area && <Meta>{formatEnumLabel(task.area)}</Meta>}
              <Link
                to={taskNotesHref(task.id)}
                className="inline-flex items-center gap-1 rounded-sm text-fg-muted hover:text-fg"
                aria-label={noteCount == null ? `Linked notes for ${task.title}` : `${noteCount} linked notes for ${task.title}`}
              >
                <StickyNote className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span aria-hidden>{noteCount == null ? 'Notes' : `Notes ${noteCount}`}</span>
              </Link>
            </span>
          </div>

          {blockers.length > 0 && <BlockerSummary taskTitle={task.title} blockers={blockers} className="pt-0.5" />}
        </div>

        <Menu>
          <MenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${task.title}`}
              disabled={busy}
              className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted transition-colors duration-(--duration-fast) hover:bg-inset hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-50 sm:h-8 sm:w-8"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </button>
          </MenuTrigger>
          <MenuContent aria-label={`Actions for ${task.title}`}>
            <MenuItem asChild>
              <Link to={`/tasks/${task.id}`}>Open details</Link>
            </MenuItem>
            <MenuItem onSelect={() => onStartSubtask(task)} disabled={busy}>Add subtask</MenuItem>
            {onStartFocusSession && !isDone && (
              <MenuItem onSelect={() => onStartFocusSession(task)} disabled={busy}>
                <Timer className="h-3.5 w-3.5" aria-hidden />
                Start focus session
              </MenuItem>
            )}
            <MenuItem onSelect={() => onSnoozeFollowUp(task)} disabled={busy}>Follow up tomorrow</MenuItem>
            <MenuItem onSelect={() => onManageDependencies(task)} disabled={busy}>Manage dependencies</MenuItem>
            <MenuItem asChild>
              <Link to={taskNotesHref(task.id)}>Open linked notes</Link>
            </MenuItem>
            <MenuSeparator />
            <MenuLabel>Change status</MenuLabel>
            {statusOptions.map((status) => (
              <MenuItem
                key={`${task.id}-${status}`}
                disabled={busy}
                onSelect={() => { if (isTaskStatus(status)) onChangeStatus(task.id, status); }}
              >
                {formatEnumLabel(status)}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem destructive onSelect={() => onDelete(task.id)} disabled={busy}>Delete</MenuItem>
          </MenuContent>
        </Menu>
      </div>
      {children}
    </li>
  );
}

export const TaskRow = memo(TaskRowImpl);
