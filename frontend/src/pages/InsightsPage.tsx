import { useMemo, useState } from 'react';
import { isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { ProgressBar } from '../components/ProgressBar';
import { StackedProgressBar, type StackedProgressSegment } from '../components/StackedProgressBar';
import { useDashboardQuery } from '../hooks/useApiQueries';
import { Card, CardHeader, PageHeader } from '../components/ui';
import { formatEnumLabel } from '../lib/enumLabels';
import { HabitAnalysisPage } from './HabitAnalysisPage';
import { FocusAnalyticsPanel } from '../components/focus/FocusAnalyticsPanel';

interface TaskAnalyticsSummary {
  completionRate?: number;
  byStatus: StackedProgressSegment[];
  byPriorityCategory: StackedProgressSegment[];
  blockedTasks?: number;
  waitingTasks?: number;
  totalTasks?: number;
  overdueTasks?: number;
}

const statusOrder = ['BACKLOG', 'NOT_STARTED', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'DONE', 'CANCELLED'];
const priorityOrder = ['DO_NOW', 'SCHEDULE', 'DELEGATE', 'DELETE'];

const statusVariants: Record<string, StackedProgressSegment['variant']> = {
  BACKLOG: 'neutral',
  NOT_STARTED: 'primary',
  IN_PROGRESS: 'accent',
  WAITING: 'warning',
  BLOCKED: 'danger',
  DONE: 'success',
  CANCELLED: 'neutral',
};

const priorityVariants: Record<string, StackedProgressSegment['variant']> = {
  DO_NOW: 'danger',
  SCHEDULE: 'warning',
  DELEGATE: 'accent',
  DELETE: 'neutral',
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
};

const normalizeCompletionRate = (value: unknown): number | undefined => {
  const numericValue = toNumber(value);
  if (numericValue === undefined) return undefined;
  return Math.min(Math.max(numericValue <= 1 ? numericValue * 100 : numericValue, 0), 100);
};

function segmentsFromRecord(value: unknown, preferredOrder: string[], variants: Record<string, StackedProgressSegment['variant']>): StackedProgressSegment[] {
  if (!isRecord(value)) return [];

  return Object.entries(value)
    .map(([key, rawValue]) => ({ key, value: toNumber(rawValue) }))
    .filter((entry): entry is { key: string; value: number } => entry.value !== undefined && entry.value >= 0)
    .sort((first, second) => {
      const firstIndex = preferredOrder.indexOf(first.key);
      const secondIndex = preferredOrder.indexOf(second.key);
      if (firstIndex === -1 && secondIndex === -1) return first.key.localeCompare(second.key);
      if (firstIndex === -1) return 1;
      if (secondIndex === -1) return -1;
      return firstIndex - secondIndex;
    })
    .map(({ key, value }) => ({ label: formatEnumLabel(key), value, variant: variants[key] ?? 'primary' }));
}

function extractTaskAnalytics(data: unknown): TaskAnalyticsSummary {
  if (!isRecord(data)) return { byStatus: [], byPriorityCategory: [] };

  return {
    completionRate: normalizeCompletionRate(data.completionRate),
    byStatus: segmentsFromRecord(data.byStatus, statusOrder, statusVariants),
    byPriorityCategory: segmentsFromRecord(data.byPriorityCategory, priorityOrder, priorityVariants),
    blockedTasks: toNumber(data.blockedTasks),
    waitingTasks: toNumber(data.waitingTasks),
    totalTasks: toNumber(data.totalTasks),
    overdueTasks: toNumber(data.overdueTasks),
  };
}

function TaskAnalyticsPanel() {
  const query = useDashboardQuery(true);
  const summary = useMemo(() => extractTaskAnalytics(query.data?.data), [query.data]);
  const blockedWaitingTotal = (summary.blockedTasks ?? 0) + (summary.waitingTasks ?? 0);
  const totalForStatus = summary.byStatus.reduce((sum, segment) => sum + segment.value, 0);
  const hasData = summary.byStatus.length > 0 || summary.byPriorityCategory.length > 0 || summary.completionRate !== undefined;

  return (
    <Card aria-labelledby="task-analytics-title">
      <CardHeader
        title={<span id="task-analytics-title">Task analytics</span>}
        description="How your task list is trending across status and priority."
      />
      <QueryState
        isLoading={query.isLoading || query.isFetching}
        isError={isQueryError(query.data)}
        isEmpty={!query.isLoading && !hasData}
        emptyMessage="No task data yet. Add a few tasks to see trends here."
      />
      {hasData && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            <article className="rounded-lg border border-line bg-inset/40 px-3.5 py-3">
              <strong className="block text-xl font-semibold tracking-tight text-fg tabular-nums">{summary.totalTasks ?? 0}</strong>
              <span className="text-xs text-fg-muted">Total tasks</span>
            </article>
            <article className="rounded-lg border border-line bg-inset/40 px-3.5 py-3">
              <strong className="block text-xl font-semibold tracking-tight text-fg tabular-nums">{summary.overdueTasks ?? 0}</strong>
              <span className="text-xs text-fg-muted">Overdue tasks</span>
            </article>
          </div>
          {summary.completionRate !== undefined && (
            <ProgressBar label="Completion rate" value={summary.completionRate} helperText="Completed tasks as a share of all tasks." variant="success" />
          )}
          {blockedWaitingTotal > 0 && (
            <ProgressBar
              label="Blocked or waiting"
              value={blockedWaitingTotal}
              max={totalForStatus || blockedWaitingTotal}
              helperText={`${summary.blockedTasks ?? 0} blocked, ${summary.waitingTasks ?? 0} waiting`}
              variant={summary.blockedTasks ? 'danger' : 'warning'}
            />
          )}
          {summary.byStatus.length > 0 && <StackedProgressBar label="By status" segments={summary.byStatus} />}
          {summary.byPriorityCategory.length > 0 && <StackedProgressBar label="By priority" segments={summary.byPriorityCategory} />}
        </div>
      )}
    </Card>
  );
}

export function InsightsPage() {
  const [tab, setTab] = useState<'tasks' | 'habits' | 'focus'>('tasks');

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Insights"
        description="Trends across your tasks and habits."
        className="mb-0"
      />
      <div className="flex gap-1 self-start rounded-lg bg-inset p-1" role="tablist" aria-label="Insights view">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'tasks'}
          onClick={() => setTab('tasks')}
          className={tab === 'tasks' ? 'rounded-md bg-card px-3 py-1.5 text-sm font-medium text-fg shadow-2xs' : 'rounded-md px-3 py-1.5 text-sm font-medium text-fg-muted hover:text-fg'}
        >
          Task analytics
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'habits'}
          onClick={() => setTab('habits')}
          className={tab === 'habits' ? 'rounded-md bg-card px-3 py-1.5 text-sm font-medium text-fg shadow-2xs' : 'rounded-md px-3 py-1.5 text-sm font-medium text-fg-muted hover:text-fg'}
        >
          Habit analytics
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'focus'}
          onClick={() => setTab('focus')}
          className={tab === 'focus' ? 'rounded-md bg-card px-3 py-1.5 text-sm font-medium text-fg shadow-2xs' : 'rounded-md px-3 py-1.5 text-sm font-medium text-fg-muted hover:text-fg'}
        >
          Focus analytics
        </button>
      </div>
      {tab === 'tasks' && <TaskAnalyticsPanel />}
      {tab === 'habits' && <HabitAnalysisPage embedded />}
      {tab === 'focus' && <FocusAnalyticsPanel />}
    </div>
  );
}
