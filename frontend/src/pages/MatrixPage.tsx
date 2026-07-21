import { useState, type ComponentType } from 'react';
import { isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { useMatrixQuery } from '../hooks/useApiQueries';
import { Badge, Button, Card, PageHeader, cn, type BadgeVariant } from '../components/ui';
import { ArrowRight, Calendar, Check, Clock, X } from '../components/ui/icons';
import { formatEnumLabel } from '../lib/enumLabels';
import { SectionTabs } from '../components/SectionTabs';
import { TASK_VIEW_TABS } from '../router/routes';

interface MatrixTask {
  id?: number | string;
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  status?: string;
  priorityScore?: number;
  priorityReason?: string | null;
}

type IconComponent = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

interface QuadrantConfig {
  key: string;
  title: string;
  subtitle: string;
  emptyLabel: string;
  emptyIcon: IconComponent;
  accent: string;
  badgeVariant: BadgeVariant;
}

const quadrants: QuadrantConfig[] = [
  {
    key: 'DO_NOW',
    title: 'Do now',
    subtitle: 'Important and urgent work.',
    emptyLabel: 'Clear for focus',
    emptyIcon: Check,
    accent: 'border-t-critical',
    badgeVariant: 'critical',
  },
  {
    key: 'SCHEDULE',
    title: 'Schedule',
    subtitle: 'Important work that needs protected time.',
    emptyLabel: 'Nothing to reserve',
    emptyIcon: Clock,
    accent: 'border-t-brand',
    badgeVariant: 'brand',
  },
  {
    key: 'DELEGATE',
    title: 'Delegate',
    subtitle: 'Urgent work that can move with help.',
    emptyLabel: 'No handoffs',
    emptyIcon: ArrowRight,
    accent: 'border-t-caution',
    badgeVariant: 'caution',
  },
  {
    key: 'DELETE',
    title: 'Delete',
    subtitle: 'Low-value work to decline, defer, or remove.',
    emptyLabel: 'No clutter found',
    emptyIcon: X,
    accent: 'border-t-line-strong',
    badgeVariant: 'neutral',
  },
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

function MatrixTaskCard({ task }: { task: MatrixTask }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-line bg-card p-3">
      <div>
        <h4 className="text-sm font-medium text-fg">{task.title ?? 'Untitled task'}</h4>
        {task.description && <p className="mt-0.5 text-sm text-fg-muted">{task.description}</p>}
      </div>
      <div className="flex flex-wrap gap-1.5" aria-label="Task metadata">
        {task.dueDate && (
          <Badge variant="outline">
            <Calendar className="h-3 w-3" aria-hidden />
            Due {task.dueDate}
          </Badge>
        )}
        {task.status && <Badge variant="outline">{formatEnumLabel(task.status)}</Badge>}
        {typeof task.priorityScore === 'number' && <Badge variant="brand">Score {task.priorityScore}</Badge>}
      </div>
      {task.priorityReason && (
        <details className="group">
          <summary className="cursor-pointer list-none text-xs font-medium text-fg-muted select-none hover:text-fg [&::-webkit-details-marker]:hidden">
            Priority details
          </summary>
          <p className="mt-1 text-xs text-fg-muted">{task.priorityReason}</p>
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
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-inset/30 px-4 py-3" aria-label="Matrix task summary">
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-fg-muted">Total tasks</span>
          <strong className="text-lg font-semibold text-fg tabular-nums">{totalTasks}</strong>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quadrantSummaries.map((quadrant) => (
            <Badge key={quadrant.key} variant={quadrant.badgeVariant}>
              {quadrant.title} <strong className="font-semibold tabular-nums">{quadrant.tasks.length}</strong>
            </Badge>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {quadrantSummaries.map((quadrant) => {
          const EmptyIcon = quadrant.emptyIcon;
          return (
            <section key={quadrant.key} className={cn('flex flex-col gap-3 rounded-xl border border-line border-t-2 bg-card p-4 shadow-2xs', quadrant.accent)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-fg">{quadrant.title}</h3>
                  <p className="mt-0.5 text-sm text-fg-muted">{quadrant.subtitle}</p>
                </div>
                <Badge variant={quadrant.badgeVariant}>{quadrant.tasks.length}</Badge>
              </div>
              {quadrant.tasks.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {quadrant.tasks.map((task, index) => <MatrixTaskCard key={taskKey(task, index)} task={task} />)}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-line px-4 py-6 text-center" role="status">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-inset text-fg-muted">
                    <EmptyIcon className="h-4 w-4" aria-hidden />
                  </span>
                  <strong className="text-sm font-medium text-fg-muted">{quadrant.emptyLabel}</strong>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function MatrixPage() {
  const [enabled, setEnabled] = useState(false);
  const query = useMatrixQuery(enabled);
  const hasData = Boolean(query.data?.ok && query.data.data);
  const canRenderQuadrants = supportsQuadrants(query.data?.data);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTabs items={TASK_VIEW_TABS} ariaLabel="Task view" />
      </div>
      <PageHeader
        title="Matrix"
        description="See tasks organized by Eisenhower-style priority categories."
        actions={
          <Button variant="primary" onClick={() => setEnabled(true)} disabled={query.isFetching}>
            {query.isFetching ? 'Loading...' : enabled ? 'Refresh matrix' : 'Load matrix'}
          </Button>
        }
        className="mb-0"
      />

      <Card aria-labelledby="matrix-content-title">
        <div className="mb-4">
          <h3 id="matrix-content-title" className="text-base font-semibold text-fg">Quadrants</h3>
          <p className="mt-0.5 text-sm text-fg-muted">Supported matrix responses render as action-oriented cards; unknown shapes keep a JSON fallback.</p>
        </div>
        <QueryState isLoading={query.isLoading || query.isFetching} isError={isQueryError(query.data)} isEmpty={!query.isLoading && Boolean(query.data && !query.data.data)} />
        {hasData && (canRenderQuadrants ? <MatrixQuadrants data={query.data?.data} /> : <pre className="overflow-x-auto rounded-lg bg-inset p-3 font-mono text-xs text-fg-muted">{JSON.stringify(query.data?.data, null, 2)}</pre>)}
      </Card>
    </div>
  );
}
