import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, EmptyState } from '../ui';
import { AlertTriangle, CheckCircle2, Clock, Inbox } from '../ui/icons';
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

/** Reason -> rail/dot accent (issue #296 redesign): overdue reads urgent, due-today reads brand-primary, scheduled reads calm/neutral - a scan-order cue on top of the grouping itself. */
const REASON_ACCENT: Record<TodayReason, string> = {
  OVERDUE: 'bg-critical',
  DUE_TODAY: 'bg-brand',
  SCHEDULED_TODAY: 'bg-fg-subtle',
};

const REASON_ORDER: TodayReason[] = ['OVERDUE', 'DUE_TODAY', 'SCHEDULED_TODAY'];

function TodayRow({ entry }: { entry: TodayTaskRecord }) {
  const navigate = useNavigate();
  const { task, todayReason, blocked } = entry;
  const showStatusBadge = task.status && task.status !== 'NOT_STARTED' && task.status !== 'DONE';

  return (
    <li>
      <button
        type="button"
        onClick={() => navigate(`/tasks/${task.id}`)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-(--duration-fast) hover:bg-inset"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{task.title}</span>
        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {task.important && <Badge variant="caution">Important</Badge>}
          {todayReason === 'OVERDUE' && task.dueDate && <Badge variant="critical" className="font-mono">Due {formatDate(task.dueDate)}</Badge>}
          <ReadinessBadge blocked={blocked} />
          {showStatusBadge && <Badge variant={taskStatusVariant(task.status)}>{formatEnumLabel(task.status)}</Badge>}
        </span>
      </button>
      {blocked && task.blockers && task.blockers.length > 0 && (
        <div className="px-2 pb-2">
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
 * already-ordered `tasks` array; never re-sorts it.
 *
 * Visual composition (issue #296 review): two instrument panels rather than a plain card list -
 * Ready is a teal hero panel with a large tabular-numeral readout, Blocked is a distinctly
 * orange-tinted lane, and each Ready sub-group carries a colored rail (red/teal/neutral) so the
 * reason is legible before reading any text. See design-system/tracker-be/pages/today.md.
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
  const blocked = useMemo(() => tasks.filter((entry) => entry.blocked), [tasks]);
  // `entry.blocked` is dependency-derived; `task.ready` is the backend's separate authoritative
  // field for whether a task's own status is actionable (issue #291/#297 review) - a WAITING or
  // BACKLOG task can be unblocked (blocked=false) without being ready. Never infer readiness from
  // `!blocked` alone: that silently treats non-actionable statuses as "ready to work".
  const ready = useMemo(() => tasks.filter((entry) => !entry.blocked && entry.task.ready === true), [tasks]);
  const waiting = useMemo(() => tasks.filter((entry) => !entry.blocked && entry.task.ready !== true), [tasks]);
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
    <div className="flex flex-col gap-4">
      {readyByReason.length > 0 && (
        <section aria-labelledby="today-ready-heading" className="overflow-hidden rounded-2xl border border-line bg-card">
          <div className="flex items-center justify-between gap-3 bg-brand-soft px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-fg">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 id="today-ready-heading" className="text-sm font-bold tracking-tight text-fg sm:text-base">Ready to work</h3>
                <p className="text-xs text-fg-muted">Do these now, in order</p>
              </div>
            </div>
            <span className="font-mono text-2xl font-bold text-brand tabular-nums sm:text-3xl">{ready.length}</span>
          </div>
          <div className="flex flex-col divide-y divide-line">
            {readyByReason.map((group) => (
              <div key={group.reason} className="px-4 py-3 sm:px-5">
                <p className="mb-1.5 flex items-center gap-2 text-[11px] font-bold tracking-wider text-fg-subtle uppercase">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${REASON_ACCENT[group.reason]}`} aria-hidden />
                  {REASON_LABEL[group.reason]}
                  <span className="font-mono text-fg-subtle">({group.items.length})</span>
                </p>
                <ul className="flex flex-col">
                  {group.items.map((entry) => <TodayRow key={entry.task.id} entry={entry} />)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {blocked.length > 0 && (
        <section aria-labelledby="today-blocked-heading" className="overflow-hidden rounded-2xl border border-caution/40 bg-card">
          <div className="flex items-center justify-between gap-3 bg-caution-soft px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-caution/15 text-caution">
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 id="today-blocked-heading" className="text-sm font-bold tracking-tight text-fg sm:text-base">Blocked</h3>
                <p className="text-xs text-fg-muted">Waiting on something else</p>
              </div>
            </div>
            <span className="font-mono text-2xl font-bold text-caution tabular-nums sm:text-3xl">{blocked.length}</span>
          </div>
          <ul className="flex flex-col divide-y divide-line px-4 py-1 sm:px-5">
            {blocked.map((entry) => <TodayRow key={entry.task.id} entry={entry} />)}
          </ul>
        </section>
      )}

      {waiting.length > 0 && (
        <section aria-labelledby="today-waiting-heading" className="overflow-hidden rounded-2xl border border-line bg-card">
          <div className="flex items-center justify-between gap-3 bg-inset px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fg-subtle/15 text-fg-subtle">
                <Clock className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 id="today-waiting-heading" className="text-sm font-bold tracking-tight text-fg sm:text-base">Waiting / not actionable</h3>
                <p className="text-xs text-fg-muted">Not blocked by a dependency, but not ready to work by status</p>
              </div>
            </div>
            <span className="font-mono text-2xl font-bold text-fg-subtle tabular-nums sm:text-3xl">{waiting.length}</span>
          </div>
          <ul className="flex flex-col divide-y divide-line px-4 py-1 sm:px-5">
            {waiting.map((entry) => <TodayRow key={entry.task.id} entry={entry} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
