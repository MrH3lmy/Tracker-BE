import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson, type ApiCallResult } from '../apiClient';
import { ProgressBar } from '../components/ProgressBar';
import { RequestInspector } from '../components/RequestInspector';
import { StackedProgressBar, type StackedProgressSegment } from '../components/StackedProgressBar';
import { appRoutes } from '../router/routes';

interface ToolCard {
  label: string;
  path: string;
  icon: string;
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
    icon: '✅',
    description: 'Capture work, tune priorities, and keep task execution visible.',
  },
  Planning: {
    icon: '🗺️',
    description: 'Shape upcoming work into a practical sequence before you start.',
  },
  Matrix: {
    icon: '🧭',
    description: 'Review effort and urgency in a matrix view for smarter prioritization.',
  },
  Calendar: {
    icon: '📆',
    description: 'Prepare scheduled work for calendar review and export workflows.',
  },
  Settings: {
    icon: '⚙️',
    description: 'Adjust workspace defaults and integration preferences.',
  },
  Import: {
    icon: '📥',
    description: 'Bring existing task lists into Tracker without losing context.',
  },
};

const featuredCapabilities = ['Prioritize tasks', 'Plan weekly focus', 'Export calendars', 'Review matrix views', 'Import backlogs', 'Tune settings'];

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

function statusClass(status: number): 'status-2xx' | 'status-4xx' | 'status-5xx' | 'status-other' {
  if (status >= 200 && status < 300) return 'status-2xx';
  if (status >= 400 && status < 500) return 'status-4xx';
  if (status >= 500 && status < 600) return 'status-5xx';
  return 'status-other';
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
    <div className="dashboard-page">
      <section className="dashboard-hero" aria-labelledby="dashboard-title">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">Command center</p>
          <h2 id="dashboard-title">Prioritize, plan, and move work from intake to calendar.</h2>
          <p>
            Tracker brings task prioritization, planning, matrix review, calendar export, import tools,
            and workspace settings into one focused dashboard.
          </p>
          <div className="dashboard-hero-actions">
            <Link to="/tasks" className="button-primary">Open tasks</Link>
            <Link to="/planning" className="button-secondary">Start planning</Link>
          </div>
        </div>
        <div className="dashboard-capability-card" aria-label="Dashboard capabilities">
          {featuredCapabilities.map((capability) => (
            <span key={capability} className="pill">{capability}</span>
          ))}
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="toolkit-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">Toolkit</p>
            <h3 id="toolkit-title">Choose your next workflow</h3>
          </div>
          <p className="section-kicker">Every card links directly to a workspace area.</p>
        </div>
        <div className="dashboard-tool-grid">
          {toolCards.map((tool) => (
            <article key={tool.path} className="dashboard-tool-card">
              <span className="dashboard-tool-icon" aria-hidden="true">{tool.icon}</span>
              <div>
                <h4>{tool.label}</h4>
                <p>{tool.description}</p>
              </div>
              <Link to={tool.path} className="button-primary dashboard-tool-link">
                Open {tool.label}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-grid" aria-label="Dashboard summaries and status">
        <div className="dashboard-section dashboard-metrics-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">API summary</p>
              <h3>Dashboard metrics</h3>
            </div>
            <button type="button" onClick={checkApi} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</button>
          </div>

          {metrics.length > 0 ? (
            <div className="dashboard-metric-grid">
              {metrics.map((metric) => (
                <article key={`${metric.hint ?? 'root'}-${metric.label}`} className="metric-card dashboard-metric-card">
                  {metric.hint && <span className="metric-hint">{metric.hint}</span>}
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-state">
              <h4>No structured metrics yet</h4>
              <p>Refresh the dashboard endpoint to render numeric, boolean, string, or list summaries when available.</p>
            </div>
          )}

          {hasProgressSummary && (
            <section className="dashboard-progress-panel" aria-labelledby="dashboard-progress-title">
              <div className="section-header compact">
                <div>
                  <p className="eyebrow">Progress</p>
                  <h4 id="dashboard-progress-title">Task completion and distribution</h4>
                </div>
              </div>
              <div className="dashboard-progress-grid">
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
            <details className="dashboard-diagnostics">
              <summary>Diagnostics: raw /api/v1/dashboard preview</summary>
              <pre>{JSON.stringify(result.data, null, 2)}</pre>
            </details>
          )}
        </div>

        <aside className="dashboard-section system-status-card" aria-labelledby="system-status-title">
          <div>
            <p className="eyebrow">System status</p>
            <h3 id="system-status-title">API health check</h3>
            <p>Keep the endpoint check handy without letting it dominate the dashboard.</p>
          </div>
          <button type="button" onClick={checkApi} disabled={loading}>{loading ? 'Checking...' : 'Check API'}</button>
          {result ? (
            <dl className="status-list">
              <div>
                <dt>Status</dt>
                <dd><span className={`status-badge ${statusClass(result.status)}`}>{result.status || result.outcome}</span></dd>
              </div>
              <div>
                <dt>Latency</dt>
                <dd>{result.latencyMs} ms</dd>
              </div>
              <div>
                <dt>Outcome</dt>
                <dd>{result.ok ? 'Connected' : result.error?.message ?? 'Unavailable'}</dd>
              </div>
            </dl>
          ) : (
            <p className="status-placeholder">Run a check to verify /api/v1/dashboard.</p>
          )}
          <details className="dashboard-diagnostics compact">
            <summary>Request inspector</summary>
            <RequestInspector result={result} />
          </details>
        </aside>
      </section>
    </div>
  );
}
