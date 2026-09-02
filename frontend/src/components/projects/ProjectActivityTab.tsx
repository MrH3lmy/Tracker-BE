import { useMemo, useState } from 'react';
import { isQueryError } from '../../apiClient';
import { useProjectActivityQuery } from '../../hooks/useApiQueries';
import { Button, EmptyState } from '../ui';
import { AlertTriangle, Clock } from '../ui/icons';
import { ActivityTimelineItem } from './ActivityTimelineItem';
import type { ProjectActivityRecord } from './projectTypes';

const PAGE_SIZE = 25;
const MAX_SIZE = 200;

const dayFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return dayFormatter.format(date);
}

function groupByDay(entries: ProjectActivityRecord[]): { label: string; items: ProjectActivityRecord[] }[] {
  const groups: { label: string; items: ProjectActivityRecord[] }[] = [];
  for (const entry of entries) {
    const label = dayLabel(entry.occurredAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(entry);
    else groups.push({ label, items: [entry] });
  }
  return groups;
}

/**
 * Newest-first project activity timeline (issue #296), grouped by day for scanability
 * (design-system/tracker-be/pages/activity.md). "Load more" grows the page size on the same
 * (newest-first) page rather than merging separate pages client-side - simpler and correct since
 * the backend orders deterministically (occurredAt desc, id desc).
 */
export function ProjectActivityTab({ projectId }: { projectId: number }) {
  const [size, setSize] = useState(PAGE_SIZE);
  const query = useProjectActivityQuery(projectId, 0, size);
  const entries = useMemo<ProjectActivityRecord[]>(() => (Array.isArray(query.data?.data) ? query.data.data : []), [query.data]);
  const groups = useMemo(() => groupByDay(entries), [entries]);
  const canLoadMore = entries.length === size && size < MAX_SIZE;
  const isInitialLoading = query.isLoading;
  const hasError = isQueryError(query.data);

  if (isInitialLoading) {
    return <p className="text-sm text-fg-muted" role="status" aria-live="polite">Loading activity...</p>;
  }

  if (hasError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load activity"
        description="Something went wrong reaching the server."
        action={<Button size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>{query.isFetching ? 'Retrying...' : 'Retry'}</Button>}
      />
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Nothing here yet"
        description="Activity shows up here as you create tasks, complete them, and add notes to this project."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <p className="mb-2 text-xs font-semibold tracking-wide text-fg-subtle uppercase">{group.label}</p>
          <ul className="flex flex-col gap-3">
            {group.items.map((entry) => <ActivityTimelineItem key={entry.id} entry={entry} />)}
          </ul>
        </section>
      ))}
      <div className="flex justify-center">
        {canLoadMore ? (
          <Button size="sm" onClick={() => setSize((current) => Math.min(current + PAGE_SIZE, MAX_SIZE))} disabled={query.isFetching}>
            {query.isFetching ? 'Loading...' : 'Load more'}
          </Button>
        ) : (
          <p className="text-xs text-fg-subtle">No more activity.</p>
        )}
      </div>
    </div>
  );
}
