import { useState } from 'react';
import { QueryState } from '../components/QueryState';
import { useMatrixQuery } from '../hooks/useApiQueries';

interface MatrixTask {
  id?: number | string;
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  status?: string;
  priorityScore?: number;
  priorityReason?: string | null;
}

interface QuadrantConfig {
  key: string;
  title: string;
  subtitle: string;
  emptyLabel: string;
  emptyIcon: string;
}

const quadrants: QuadrantConfig[] = [
  {
    key: 'DO_NOW',
    title: 'Do now',
    subtitle: 'Important and urgent work.',
    emptyLabel: 'Clear for focus',
    emptyIcon: '✓',
  },
  {
    key: 'SCHEDULE',
    title: 'Schedule',
    subtitle: 'Important work that needs protected time.',
    emptyLabel: 'Nothing to reserve',
    emptyIcon: '◷',
  },
  {
    key: 'DELEGATE',
    title: 'Delegate',
    subtitle: 'Urgent work that can move with help.',
    emptyLabel: 'No handoffs',
    emptyIcon: '↗',
  },
  {
    key: 'DELETE',
    title: 'Delete',
    subtitle: 'Low-value work to decline, defer, or remove.',
    emptyLabel: 'No clutter found',
    emptyIcon: '−',
  },
];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const asMatrixTask = (value: unknown): MatrixTask | null => isRecord(value) ? value as MatrixTask : null;
const taskKey = (task: MatrixTask, index: number) => task.id ?? `${task.title ?? 'task'}-${index}`;
const quadrantClassName = (key: string) => `matrix-${key.toLowerCase().replace('_', '-')}`;
const statusClassName = (status: string) => `matrix-task-pill--${status.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'status'}`;

function getQuadrantTasks(data: unknown, key: string): MatrixTask[] | null {
  if (!isRecord(data) || !Array.isArray(data[key])) return null;
  return data[key].map(asMatrixTask).filter((task): task is MatrixTask => task !== null);
}

function supportsQuadrants(data: unknown): boolean {
  return quadrants.some((quadrant) => getQuadrantTasks(data, quadrant.key) !== null);
}

function MatrixTaskCard({ task, index }: { task: MatrixTask; index: number }) {
  return (
    <article key={taskKey(task, index)} className="task-preview-card compact matrix-task-card">
      <div className="matrix-task-copy">
        <h4>{task.title ?? 'Untitled task'}</h4>
        {task.description && <p>{task.description}</p>}
      </div>
      <div className="task-preview-meta matrix-task-meta" aria-label="Task metadata">
        {task.dueDate && <span className="matrix-task-pill matrix-task-pill--due">Due {task.dueDate}</span>}
        {task.status && <span className={`matrix-task-pill ${statusClassName(task.status)}`}>{task.status}</span>}
        {typeof task.priorityScore === 'number' && <span className="matrix-task-score">Score {task.priorityScore}</span>}
      </div>
      {task.priorityReason && (
        <details className="matrix-task-diagnostics">
          <summary>Priority details</summary>
          <p>{task.priorityReason}</p>
        </details>
      )}
    </article>
  );
}

function MatrixQuadrants({ data }: { data: unknown }) {
  const quadrantSummaries = quadrants.map((quadrant) => ({
    ...quadrant,
    tasks: getQuadrantTasks(data, quadrant.key) ?? [],
  }));
  const totalTasks = quadrantSummaries.reduce((total, quadrant) => total + quadrant.tasks.length, 0);

  return (
    <>
      <section className="matrix-summary-band" aria-label="Matrix task summary">
        <div className="matrix-summary-total">
          <span>Total tasks</span>
          <strong>{totalTasks}</strong>
        </div>
        <div className="matrix-summary-counts">
          {quadrantSummaries.map((quadrant) => (
            <span key={quadrant.key} className={`matrix-summary-pill ${quadrantClassName(quadrant.key)}`}>
              {quadrant.title}
              <strong>{quadrant.tasks.length}</strong>
            </span>
          ))}
        </div>
      </section>

      <div className="matrix-grid">
        {quadrantSummaries.map((quadrant) => (
          <section key={quadrant.key} className={`matrix-quadrant ${quadrantClassName(quadrant.key)}`}>
            <div className="section-card-header">
              <div>
                <p className="eyebrow">{quadrant.key.replace('_', ' ')}</p>
                <h3>{quadrant.title}</h3>
                <p>{quadrant.subtitle}</p>
              </div>
              <span className="status-badge status-other">{quadrant.tasks.length}</span>
            </div>
            {quadrant.tasks.length > 0 ? (
              <div className="mini-card-list">
                {quadrant.tasks.map((task, index) => <MatrixTaskCard key={taskKey(task, index)} task={task} index={index} />)}
              </div>
            ) : (
              <div className="matrix-empty-state" role="status">
                <span aria-hidden="true">{quadrant.emptyIcon}</span>
                <strong>{quadrant.emptyLabel}</strong>
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}

export function MatrixPage() {
  const [enabled, setEnabled] = useState(false);
  const query = useMatrixQuery(enabled);
  const hasData = Boolean(query.data?.ok && query.data.data);
  const canRenderQuadrants = supportsQuadrants(query.data?.data);

  return (
    <div className="page-pattern matrix-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Priority matrix</p>
          <h2>Matrix</h2>
          <p>See tasks organized by Eisenhower-style priority categories, with diagnostics separated below.</p>
        </div>
        <button type="button" className="button-primary" onClick={() => setEnabled(true)} disabled={query.isFetching}>
          {query.isFetching ? 'Loading...' : enabled ? 'Refresh matrix' : 'Load matrix'}
        </button>
      </header>

      <section className="page-card main-content-card" aria-labelledby="matrix-content-title">
        <div className="section-header">
          <div>
            <h3 id="matrix-content-title">Quadrants</h3>
            <p className="muted">Supported matrix responses render as action-oriented cards; unknown shapes keep a JSON fallback.</p>
          </div>
        </div>
        <QueryState isLoading={query.isLoading || query.isFetching} isError={Boolean(query.data && !query.data.ok)} isEmpty={!query.isLoading && Boolean(query.data && !query.data.data)} />
        {hasData && (canRenderQuadrants ? <MatrixQuadrants data={query.data?.data} /> : <pre>{JSON.stringify(query.data?.data, null, 2)}</pre>)}
      </section>

    </div>
  );
}
