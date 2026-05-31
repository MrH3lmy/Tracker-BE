import { useState } from 'react';
import { RequestInspector } from '../components/RequestInspector';
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
}

const quadrants: QuadrantConfig[] = [
  { key: 'DO_NOW', title: 'Do now', subtitle: 'Important and urgent work.' },
  { key: 'SCHEDULE', title: 'Schedule', subtitle: 'Important work that needs protected time.' },
  { key: 'DELEGATE', title: 'Delegate', subtitle: 'Urgent work that can move with help.' },
  { key: 'DELETE', title: 'Delete', subtitle: 'Low-value work to decline, defer, or remove.' },
];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const asMatrixTask = (value: unknown): MatrixTask | null => isRecord(value) ? value as MatrixTask : null;
const taskKey = (task: MatrixTask, index: number) => task.id ?? `${task.title ?? 'task'}-${index}`;

function getQuadrantTasks(data: unknown, key: string): MatrixTask[] | null {
  if (!isRecord(data) || !Array.isArray(data[key])) return null;
  return data[key].map(asMatrixTask).filter((task): task is MatrixTask => task !== null);
}

function supportsQuadrants(data: unknown): boolean {
  return quadrants.some((quadrant) => getQuadrantTasks(data, quadrant.key) !== null);
}

function MatrixTaskCard({ task, index }: { task: MatrixTask; index: number }) {
  return (
    <article key={taskKey(task, index)} className="task-preview-card compact">
      <div>
        <h4>{task.title ?? 'Untitled task'}</h4>
        {task.description && <p>{task.description}</p>}
      </div>
      <div className="task-preview-meta">
        {task.dueDate && <span className="pill">Due {task.dueDate}</span>}
        {task.status && <span className="pill">{task.status}</span>}
        {typeof task.priorityScore === 'number' && <span className="pill">Score {task.priorityScore}</span>}
      </div>
      {task.priorityReason && <p className="muted">{task.priorityReason}</p>}
    </article>
  );
}

function MatrixQuadrants({ data }: { data: unknown }) {
  return (
    <div className="matrix-grid">
      {quadrants.map((quadrant) => {
        const tasks = getQuadrantTasks(data, quadrant.key) ?? [];
        return (
          <section key={quadrant.key} className={`matrix-quadrant matrix-${quadrant.key.toLowerCase().replace('_', '-')}`}>
            <div className="section-card-header">
              <div>
                <p className="eyebrow">{quadrant.key.replace('_', ' ')}</p>
                <h3>{quadrant.title}</h3>
                <p>{quadrant.subtitle}</p>
              </div>
              <span className="status-badge status-other">{tasks.length}</span>
            </div>
            {tasks.length > 0 ? (
              <div className="mini-card-list">
                {tasks.map((task, index) => <MatrixTaskCard key={taskKey(task, index)} task={task} index={index} />)}
              </div>
            ) : (
              <p className="muted">No tasks in this quadrant.</p>
            )}
          </section>
        );
      })}
    </div>
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

      <section className="page-card diagnostics-card" aria-labelledby="matrix-diagnostics-title">
        <h3 id="matrix-diagnostics-title">Request diagnostics</h3>
        <p className="muted">Raw matrix request metadata, status, latency, and parsed response.</p>
        <RequestInspector result={query.data ?? null} />
      </section>
    </div>
  );
}
