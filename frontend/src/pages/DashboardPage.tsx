import { useMemo, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { apiJson, type ApiCallResult } from '../apiClient';
import { ProgressBar } from '../components/ProgressBar';
import { StackedProgressBar, type StackedProgressSegment } from '../components/StackedProgressBar';
import { appRoutes } from '../router/routes';
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, type BadgeVariant } from '../components/ui';
import {
  ArrowRight,
  Calendar,
  CalendarDays,
  Grid2x2,
  Import,
  Inbox,
  ListTodo,
  Settings,
} from '../components/ui/icons';

type IconComponent = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

interface ToolCard {
  label: string;
  path: string;
  icon: IconComponent;
  description: string;
}

interface DashboardMetric {
  label: string;
  value: string;
  hint?: string;
}

interface DashboardSummaryView {
  completionRate?: number;
  byStatus: StackedProgressSegment[];
  byPriorityCategory: StackedProgressSegment[];
  blockedTasks?: number;
  waitingTasks?: number;
}

const toolMetadata: Record<string, Pick<ToolCard, 'icon' | 'description'>> = {
  Tasks: {
    icon: ListTodo,
    description: 'Capture work, tune priorities, and keep task execution visible.',
  },
  Planning: {
    icon: CalendarDays,
    description: 'Shape upcoming work into a practical sequence before you start.',
  },
  Matrix: {
    icon: Grid2x2,
    description: 'Review effort and urgency in a matrix view for smarter prioritization.',
  },
  Calendar: {
    icon: Calendar,
    description: 'Prepare scheduled work for calendar review and export workflows.',
  },
  Settings: {
    icon: Settings,
    description: 'Adjust workspace defaults and integration preferences.',
  },
  Import: {
    icon: Import,
    description: 'Bring existing task lists into Tracker without losing context.',
  },
};

const metricLabels: Record<string, string> = {
  total: 'Total tasks',
  totalTasks: 'Total tasks',
  tasksTotal: 'Total tasks',
  open: 'Open tasks',
  openTasks: 'Open tasks',
  completed: 'Completed tasks',
  completedTasks: 'Completed tasks',
  overdue: 'Overdue tasks',
  overdueTasks: 'Overdue tasks',
  planned: 'Planned tasks',
  plannedTasks: 'Planned tasks',
  imported: 'Imported items',
  importedTasks: 'Imported items',
  completionRate: 'Completion rate',
  byStatus: 'Tasks by status',
  byPriorityCategory: 'Tasks by priority',
  blockedTasks: 'Blocked tasks',
  waitingTasks: 'Waiting tasks',
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function titleize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (firstLetter) => firstLetter.toUpperCase());
}

function formatMetricValue(value: unknown): string {
  if (typeof value === 'number') return new Intl.NumberFormat().format(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
}

function normalizeCompletionRate(value: unknown): number | undefined {
  const numericValue = toNumber(value);
  if (numericValue === undefined) return undefined;

  return Math.min(Math.max(numericValue <= 1 ? numericValue * 100 : numericValue, 0), 100);
}

function countFromRecord(record: Record<string, unknown>, key: string): number | undefined {
  return toNumber(record[key]) ?? toNumber(record[key.toLowerCase()]) ?? toNumber(record[titleize(key)]);
}

function segmentsFromRecord(
  value: unknown,
  preferredOrder: string[],
  variants: Record<string, StackedProgressSegment['variant']>,
): StackedProgressSegment[] {
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
    .map(({ key, value }) => ({
      label: titleize(key),
      value,
      variant: variants[key] ?? 'primary',
    }));
}

function extractDashboardSummary(data: unknown): DashboardSummaryView {
  if (!isRecord(data)) {
    return { byStatus: [], byPriorityCategory: [] };
  }

  const byStatus = segmentsFromRecord(data.byStatus, statusOrder, statusVariants);
  const byPriorityCategory = segmentsFromRecord(data.byPriorityCategory, priorityOrder, priorityVariants);
  const byStatusRecord = isRecord(data.byStatus) ? data.byStatus : undefined;

  return {
    completionRate: normalizeCompletionRate(data.completionRate),
    byStatus,
    byPriorityCategory,
    blockedTasks: toNumber(data.blockedTasks) ?? (byStatusRecord ? countFromRecord(byStatusRecord, 'BLOCKED') : undefined),
    waitingTasks: toNumber(data.waitingTasks) ?? (byStatusRecord ? countFromRecord(byStatusRecord, 'WAITING') : undefined),
  };
}

function collectMetrics(data: unknown, parentLabel?: string): DashboardMetric[] {
  if (!isRecord(data)) return [];

  return Object.entries(data).flatMap(([key, value]) => {
    const label = metricLabels[key] ?? titleize(key);

    if (typeof value === 'number' || typeof value === 'boolean') {
      return [{ label, value: formatMetricValue(value), hint: parentLabel }];
    }

    if (typeof value === 'string' && value.length > 0 && value.length <= 48) {
      return [{ label, value, hint: parentLabel }];
    }

    if (Array.isArray(value)) {
      return [{ label, value: formatMetricValue(value.length), hint: 'items returned' }];
    }

    if (isRecord(value)) {
      return collectMetrics(value, label);
    }

    return [];
  });
}

function statusBadgeVariant(status: number): BadgeVariant {
  if (status >= 200 && status < 300) return 'positive';
  if (status >= 400 && status < 600) return 'critical';
  return 'neutral';
}

export function DashboardPage() {
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const toolCards = useMemo<ToolCard[]>(() => (
    appRoutes
      .filter(({ label }) => Object.hasOwn(toolMetadata, label))
      .map(({ label, path }) => ({
        label,
        path,
        icon: toolMetadata[label].icon,
        description: toolMetadata[label].description,
      }))
  ), []);

  const metrics = useMemo(() => collectMetrics(result?.data).slice(0, 8), [result?.data]);
  const dashboardSummary = useMemo(() => extractDashboardSummary(result?.data), [result?.data]);
  const hasProgressSummary = dashboardSummary.completionRate !== undefined
    || dashboardSummary.byStatus.length > 0
    || dashboardSummary.byPriorityCategory.length > 0
    || dashboardSummary.blockedTasks !== undefined
    || dashboardSummary.waitingTasks !== undefined;
  const blockedWaitingTotal = (dashboardSummary.blockedTasks ?? 0) + (dashboardSummary.waitingTasks ?? 0);
  const hasRawPreview = result?.data !== undefined && result?.data !== null;

  const checkApi = async () => {
    setLoading(true);
    try {
      setResult(await apiJson<unknown>('GET', '/api/v1/dashboard'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description="Prioritize, plan, and move work from intake to calendar."
        actions={
          <>
            <Link
              to="/calendar/auto-plan"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-card px-3.5 text-sm font-medium text-fg shadow-2xs hover:bg-inset"
            >
              Start planning
            </Link>
            <Link
              to="/tasks"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3.5 text-sm font-medium text-brand-fg hover:bg-brand-hover"
            >
              Open tasks
            </Link>
          </>
        }
        className="mb-0"
      />

      <section aria-labelledby="toolkit-title" className="flex flex-col gap-3">
        <h3 id="toolkit-title" className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Workspaces</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {toolCards.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.path}
                to={tool.path}
                className="group rounded-xl border border-line bg-card p-4 shadow-2xs transition-colors duration-(--duration-fast) hover:border-line-strong hover:bg-inset/40"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <span className="flex items-center gap-1 text-sm font-semibold text-fg">
                      {tool.label}
                      <ArrowRight className="h-3.5 w-3.5 text-fg-subtle opacity-0 transition-opacity duration-(--duration-fast) group-hover:opacity-100" aria-hidden />
                    </span>
                    <p className="mt-0.5 text-sm text-fg-muted">{tool.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid items-start gap-4 lg:grid-cols-[2fr_1fr]" aria-label="Dashboard summaries and status">
        <Card>
          <CardHeader
            title="Metrics"
            description="Summaries from /api/v1/dashboard."
            actions={
              <Button size="sm" onClick={checkApi} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            }
          />

          {metrics.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {metrics.map((metric) => (
                <article key={`${metric.hint ?? 'root'}-${metric.label}`} className="rounded-lg border border-line bg-inset/40 px-3.5 py-3">
                  {metric.hint && <span className="block text-[11px] text-fg-subtle">{metric.hint}</span>}
                  <strong className="block text-xl font-semibold tracking-tight text-fg tabular-nums">{metric.value}</strong>
                  <span className="text-xs text-fg-muted">{metric.label}</span>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Inbox}
              title="No metrics loaded yet"
              description="Refresh to pull numeric, boolean, string, or list summaries from the dashboard endpoint."
              action={<Button size="sm" onClick={checkApi} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</Button>}
            />
          )}

          {hasProgressSummary && (
            <section className="mt-5 border-t border-line pt-4" aria-labelledby="dashboard-progress-title">
              <h4 id="dashboard-progress-title" className="mb-3 text-sm font-semibold text-fg">Task completion and distribution</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {dashboardSummary.completionRate !== undefined && (
                  <ProgressBar
                    label="Completion rate"
                    value={dashboardSummary.completionRate}
                    helperText="Completed tasks as a share of all dashboard tasks."
                    variant="success"
                  />
                )}
                {blockedWaitingTotal > 0 && (
                  <ProgressBar
                    label="Blocked or waiting"
                    value={blockedWaitingTotal}
                    max={dashboardSummary.byStatus.reduce((sum, segment) => sum + segment.value, 0) || blockedWaitingTotal}
                    helperText={`${formatMetricValue(dashboardSummary.blockedTasks ?? 0)} blocked, ${formatMetricValue(dashboardSummary.waitingTasks ?? 0)} waiting`}
                    variant={dashboardSummary.blockedTasks ? 'danger' : 'warning'}
                  />
                )}
                {dashboardSummary.byStatus.length > 0 && (
                  <StackedProgressBar label="By status" segments={dashboardSummary.byStatus} />
                )}
                {dashboardSummary.byPriorityCategory.length > 0 && (
                  <StackedProgressBar label="By priority category" segments={dashboardSummary.byPriorityCategory} />
                )}
              </div>
            </section>
          )}

          {hasRawPreview && (
            <details className="group mt-5 rounded-lg border border-line">
              <summary className="cursor-pointer list-none rounded-lg px-4 py-3 text-sm font-medium text-fg-muted select-none hover:bg-inset [&::-webkit-details-marker]:hidden">
                Diagnostics: raw /api/v1/dashboard preview
              </summary>
              <pre className="overflow-x-auto border-t border-line px-4 py-3 font-mono text-xs text-fg-muted">{JSON.stringify(result.data, null, 2)}</pre>
            </details>
          )}
        </Card>

        <Card aria-labelledby="system-status-title">
          <CardHeader
            title={<span id="system-status-title">API health</span>}
            description="Verify /api/v1/dashboard connectivity."
            actions={
              <Button size="sm" onClick={checkApi} disabled={loading}>
                {loading ? 'Checking...' : 'Check API'}
              </Button>
            }
          />
          {result ? (
            <dl className="flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-fg-muted">Status</dt>
                <dd><Badge variant={statusBadgeVariant(result.status)}>{result.status || result.outcome}</Badge></dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-fg-muted">Latency</dt>
                <dd className="font-medium text-fg tabular-nums">{result.latencyMs} ms</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-fg-muted">Outcome</dt>
                <dd className="font-medium text-fg">{result.ok ? 'Connected' : result.error?.message ?? 'Unavailable'}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-fg-muted">Run a check to verify /api/v1/dashboard.</p>
          )}
        </Card>
      </section>
    </div>
  );
}
