import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson, type ApiCallResult } from '../apiClient';
import { RequestInspector } from '../components/RequestInspector';
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
