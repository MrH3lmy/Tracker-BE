import { Button, EmptyState } from '../ui';
import { AlertTriangle, Archive, CheckCircle2, Inbox, ListTodo, Plus, RefreshCw } from '../ui/icons';
import { TASK_SIGNAL_LABEL, type TaskLens, type TaskLensCounts, type TaskSignal } from './taskLenses';

export type TaskScope = 'active' | 'done' | 'archive';

/** Stable-height placeholder rows. The skill's `ux` "Loading Indicators" (High) rule asks for a
 *  stable skeleton with an accessible busy status rather than a spinner that flashes and shifts. */
export function TaskListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-start gap-3 px-3 py-3.5">
          <span className="h-5 w-5 shrink-0 rounded-full bg-inset" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="block h-3.5 rounded bg-inset" style={{ width: `${68 - index * 7}%` }} />
            <span className="block h-2.5 w-1/3 rounded bg-inset/70" />
          </div>
          <span className="h-5 w-5 shrink-0 rounded bg-inset" />
        </div>
      ))}
    </div>
  );
}

export function TaskListError({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-xl border border-critical/40 bg-critical-soft px-6 py-10 text-center"
    >
      <AlertTriangle className="h-5 w-5 text-critical" aria-hidden />
      <p className="text-sm font-medium text-fg">Tasks could not be loaded</p>
      <p className="max-w-sm text-sm text-fg-muted">The request to the tasks API failed. Your work is safe — nothing was changed.</p>
      <Button variant="secondary" size="sm" className="mt-1" onClick={onRetry} disabled={isRetrying}>
        <RefreshCw className="h-4 w-4" aria-hidden />
        {isRetrying ? 'Retrying…' : 'Try again'}
      </Button>
    </div>
  );
}

export interface TaskListEmptyProps {
  scope: TaskScope;
  lens: TaskLens;
  signals: TaskSignal[];
  hasQueryFilters: boolean;
  lensCounts: TaskLensCounts;
  onAddTask: () => void;
  onClearFilters: () => void;
  onShowBlocked: () => void;
  onShowAll: () => void;
  disabled?: boolean;
}

/**
 * Eight intentional states. The skill's `ux` "No Results" rule rejects a bare "0 results" and asks
 * for a suggestion, and "Empty States" asks for a helpful message *and* an action — so every
 * branch below names what happened and offers the next useful move.
 */
export function TaskListEmpty({ scope, lens, signals, hasQueryFilters, lensCounts, onAddTask, onClearFilters, onShowBlocked, onShowAll, disabled = false }: TaskListEmptyProps) {
  const addAction = (
    <Button variant="primary" size="sm" onClick={onAddTask} disabled={disabled}>
      <Plus className="h-4 w-4" aria-hidden />
      Add task
    </Button>
  );
  const clearAction = (
    <Button variant="secondary" size="sm" onClick={onClearFilters} disabled={disabled}>Clear filters</Button>
  );
  const showAllAction = (
    <Button variant="secondary" size="sm" onClick={onShowAll} disabled={disabled}>Show all tasks</Button>
  );

  if (hasQueryFilters) {
    return (
      <Wrapper>
        <EmptyState
          icon={Inbox}
          title="No tasks match these filters"
          description="Try a broader search term, or clear the filters to see everything in this view."
          action={clearAction}
        />
      </Wrapper>
    );
  }

  if (signals.length > 0) {
    const label = signals.map((signal) => TASK_SIGNAL_LABEL[signal].toLowerCase()).join(' and ');
    return (
      <Wrapper>
        <EmptyState
          icon={CheckCircle2}
          title={`Nothing ${label} right now`}
          description="That is good news — turn the signal off to go back to the full list."
          action={showAllAction}
        />
      </Wrapper>
    );
  }

  if (lens === 'ready') {
    return (
      <Wrapper>
        <EmptyState
          icon={CheckCircle2}
          title="No tasks are ready to start"
          description={
            lensCounts.blocked > 0
              ? `Nothing is actionable yet, but ${lensCounts.blocked} task${lensCounts.blocked === 1 ? ' is' : 's are'} blocked. Reviewing those blockers is the fastest way to unblock work.`
              : 'Nothing is actionable yet. Add a task, or move something out of Waiting to start work.'
          }
          action={lensCounts.blocked > 0
            ? <Button variant="secondary" size="sm" onClick={onShowBlocked} disabled={disabled}>Review blocked tasks</Button>
            : addAction}
        />
      </Wrapper>
    );
  }

  if (lens === 'blocked') {
    return (
      <Wrapper>
        <EmptyState
          icon={CheckCircle2}
          title="Nothing is blocked"
          description="No task is waiting on an unfinished dependency right now."
          action={showAllAction}
        />
      </Wrapper>
    );
  }

  if (lens === 'waiting') {
    return (
      <Wrapper>
        <EmptyState
          icon={CheckCircle2}
          title="Nothing is parked"
          description="Every task is either ready to start or blocked by a dependency."
          action={showAllAction}
        />
      </Wrapper>
    );
  }

  if (scope === 'done') {
    return (
      <Wrapper>
        <EmptyState
          icon={CheckCircle2}
          title="Nothing completed yet"
          description="Completed tasks land here so you can review what shipped."
        />
      </Wrapper>
    );
  }

  if (scope === 'archive') {
    return (
      <Wrapper>
        <EmptyState
          icon={Archive}
          title="The archive is empty"
          description="Archived tasks are kept out of the active list but stay searchable here."
        />
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <EmptyState
        icon={ListTodo}
        title="No active tasks yet"
        description="Create your first task to start tracking work — you can add dates, effort and dependencies later."
        action={addAction}
      />
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <div role="status">{children}</div>;
}
