import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, EmptyState } from '../ui';
import { AlertTriangle, CheckCircle2, Inbox } from '../ui/icons';
import { formatEnumLabel } from '../../lib/enumLabels';
import { BlockerDisclosure } from './BlockerDisclosure';
import { ReadinessBadge } from './ReadinessBadge';
import { taskStatusVariant } from './taskStyleUtils';
import { formatDate } from './taskUtils';
import type { TodayReason, TodayResponseRecord, TodayTaskRecord } from './taskTypes';

const REASON_LABEL: Record<TodayReason, string> = {
  OVERDUE: 'Overdue',
  DUE_TODAY: 'Due today',
  SCHEDULED_TODAY: 'Scheduled today',
};

const REASON_ORDER: TodayReason[] = ['OVERDUE', 'DUE_TODAY', 'SCHEDULED_TODAY'];

function TodayRow({ entry }: { entry: TodayTaskRecord }) {
  const navigate = useNavigate();
  const { task, todayReason, blocked } = entry;
  const showStatusBadge = task.status && task.status !== 'NOT_STARTED' && task.status !== 'DONE';

  return (
    <li className="rounded-lg border border-line bg-inset/30">
      <button
        type="button"
        onClick={() => navigate(`/tasks/${task.id}`)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors duration-(--duration-fast) hover:bg-inset"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{task.title}</span>
        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {task.important && <Badge variant="caution">Important</Badge>}
          {todayReason === 'OVERDUE' && task.dueDate && <Badge variant="critical">Due {formatDate(task.dueDate)}</Badge>}
          <ReadinessBadge blocked={blocked} />
          {showStatusBadge && <Badge variant={taskStatusVariant(task.status)}>{formatEnumLabel(task.status)}</Badge>}
        </span>
      </button>
      {blocked && task.blockers && task.blockers.length > 0 && (
        <div className="px-3.5 pb-3">
          <BlockerDisclosure blockers={task.blockers} />
        </div>
      )}
    </li>
  );
}

export interface TodaySectionsProps {
  data?: TodayResponseRecord;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

/**
 * Shared between the global Today page and a project's Today tab (issue #296) - the same
 * ready/blocked/reason grouping logic must never be implemented twice. Groups the backend's
 * already-ordered `tasks` array; never re-sorts it (see design-system/tracker-be/pages/today.md).
 */
export function TodaySections({
  data,
  isLoading,
  isError,
  onRetry,
  isRetrying,
  emptyTitle = "Nothing due today",
  emptyDescription = "You're clear — nothing overdue, due, or scheduled for today.",
}: TodaySectionsProps) {
  const tasks = useMemo(() => data?.tasks ?? [], [data]);
  const ready = useMemo(() => tasks.filter((entry) => !entry.blocked), [tasks]);
  const blocked = useMemo(() => tasks.filter((entry) => entry.blocked), [tasks]);
  const readyByReason = useMemo(
    () => REASON_ORDER.map((reason) => ({ reason, items: ready.filter((entry) => entry.todayReason === reason) })).filter((group) => group.items.length > 0),
    [ready],
  );

  if (isLoading) {
    return <p className="text-sm text-fg-muted" role="status" aria-live="polite">Loading today...</p>;
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load today's tasks"
        description="Something went wrong reaching the server."
        action={onRetry && <Button size="sm" onClick={onRetry} disabled={isRetrying}>{isRetrying ? 'Retrying...' : 'Retry'}</Button>}
      />
    );
  }

  if (tasks.length === 0) {
    return <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="flex flex-col gap-5">
      {readyByReason.length > 0 && (
        <section aria-labelledby="today-ready-heading">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-positive" aria-hidden />
            <h3 id="today-ready-heading" className="text-sm font-semibold text-fg">Ready to work</h3>
            <Badge variant="neutral">{ready.length}</Badge>
          </div>
          <div className="flex flex-col gap-4">
            {readyByReason.map((group) => (
              <div key={group.reason}>
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-fg-subtle uppercase">{REASON_LABEL[group.reason]}</p>
                <ul className="flex flex-col gap-1.5">
                  {group.items.map((entry) => <TodayRow key={entry.task.id} entry={entry} />)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {blocked.length > 0 && (
        <section aria-labelledby="today-blocked-heading">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-caution" aria-hidden />
            <h3 id="today-blocked-heading" className="text-sm font-semibold text-fg">Blocked</h3>
            <Badge variant="neutral">{blocked.length}</Badge>
          </div>
          <ul className="flex flex-col gap-1.5">
            {blocked.map((entry) => <TodayRow key={entry.task.id} entry={entry} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
