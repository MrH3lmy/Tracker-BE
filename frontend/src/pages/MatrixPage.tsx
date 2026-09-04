import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { useMatrixQuery } from '../hooks/useApiQueries';
import { Badge, Button, cn, type BadgeVariant } from '../components/ui';
import { AlertTriangle, ArrowRight, Calendar, Check, CheckCircle2, Clock, RefreshCw, X } from '../components/ui/icons';
import { formatEnumLabel } from '../lib/enumLabels';
import { SectionTabs } from '../components/SectionTabs';
import { TASK_VIEW_TABS } from '../router/routes';

/**
 * The matrix endpoint returns a loosely-typed shape, so every field is optional and
 * validated at the edge. `blocked`/`ready`/`blockers` are backend truth when present
 * and are never derived from one another.
 */
interface MatrixTask {
  id?: number | string;
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  status?: string;
  priorityScore?: number;
  priorityReason?: string | null;
  blocked?: boolean;
  ready?: boolean;
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
    subtitle: 'Important and urgent.',
    emptyLabel: 'Clear for focus',
    emptyIcon: Check,
    accent: 'border-l-critical',
    badgeVariant: 'critical',
  },
  {
    key: 'SCHEDULE',
    title: 'Schedule',
    subtitle: 'Important, needs protected time.',
    emptyLabel: 'Nothing to reserve',
    emptyIcon: Clock,
    accent: 'border-l-brand',
    badgeVariant: 'brand',
  },
  {
    key: 'DELEGATE',
    title: 'Delegate',
    subtitle: 'Urgent, can move with help.',
    emptyLabel: 'No handoffs',
    emptyIcon: ArrowRight,
    accent: 'border-l-caution',
    badgeVariant: 'caution',
  },
  {
    key: 'DELETE',
    title: 'Drop',
    subtitle: 'Low value — decline, defer or remove.',
    emptyLabel: 'No clutter found',
    emptyIcon: X,
    accent: 'border-l-line-strong',
    badgeVariant: 'neutral',
  },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const asMatrixTask = (value: unknown): MatrixTask | null => (isRecord(value) ? (value as MatrixTask) : null);
const taskKey = (task: MatrixTask, index: number) => task.id ?? `${task.title ?? 'task'}-${index}`;

function getQuadrantTasks(data: unknown, key: string): MatrixTask[] | null {
  if (!isRecord(data) || !Array.isArray(data[key])) return null;
  return data[key].map(asMatrixTask).filter((task): task is MatrixTask => task !== null);
}

function supportsQuadrants(data: unknown): boolean {
  return quadrants.some((quadrant) => getQuadrantTasks(data, quadrant.key) !== null);
}

function MatrixTaskRow({ task }: { task: MatrixTask }) {
  const title = task.title ?? 'Untitled task';
  const hasId = task.id !== undefined && task.id !== null && task.id !== '';

  return (
    <li className="rounded-md border border-line bg-card p-2.5">
      <div className="flex items-start justify-between gap-2">
        {/* The matrix previously rendered inert cards; a task here is now the same
            navigable object it is on every other surface. */}
        {hasId ? (
          <Link
            to={`/tasks/${task.id}`}
            className="min-w-0 flex-1 rounded-xs text-sm font-medium text-fg hover:underline"
          >
            <span className="line-clamp-2 break-words" title={title}>
              {title}
            </span>
          </Link>
        ) : (
          <span className="min-w-0 flex-1 text-sm font-medium text-fg">{title}</span>
        )}
        {typeof task.priorityScore === 'number' && (
          <span className="shrink-0 text-xs font-semibold text-fg-muted tabular-nums" title="Priority score">
            {task.priorityScore}
          </span>
        )}
      </div>

      {task.description && <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{task.description}</p>}

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5" aria-label="Task metadata">
        {/* Readiness is backend truth. `blocked` and `ready` are separate axes and
            neither is inferred from the other. */}
        {task.blocked === true && (
          <Badge variant="caution">
            <AlertTriangle className="h-3 w-3" aria-hidden />
            Blocked
          </Badge>
        )}
        {task.blocked !== true && task.ready === true && (
          <Badge variant="positive">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            Ready
          </Badge>
        )}
        {task.dueDate && (
          <Badge variant="outline">
            <Calendar className="h-3 w-3" aria-hidden />
            <time dateTime={task.dueDate}>Due {task.dueDate}</time>
          </Badge>
        )}
        {task.status && <Badge variant="outline">{formatEnumLabel(task.status)}</Badge>}
      </div>

      {task.priorityReason && (
        <details className="group mt-1.5">
          <summary className="min-h-6 cursor-pointer list-none text-xs font-medium text-fg-muted select-none hover:text-fg [&::-webkit-details-marker]:hidden">
            Why this ranking
          </summary>
          <p className="mt-1 text-xs text-fg-muted">{task.priorityReason}</p>
        </details>
      )}
    </li>
  );
}

function MatrixQuadrants({ data }: { data: unknown }) {
  const quadrantSummaries = quadrants.map((quadrant) => ({
    ...quadrant,
    tasks: getQuadrantTasks(data, quadrant.key) ?? [],
  }));
  const totalTasks = quadrantSummaries.reduce((total, quadrant) => total + quadrant.tasks.length, 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-fg-muted">
        <strong className="font-semibold text-fg tabular-nums">{totalTasks}</strong>{' '}
        {totalTasks === 1 ? 'task' : 'tasks'} ranked across four quadrants.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {quadrantSummaries.map((quadrant) => {
          const EmptyIcon = quadrant.emptyIcon;
          return (
            <section
              key={quadrant.key}
              aria-label={`${quadrant.title}, ${quadrant.tasks.length} ${quadrant.tasks.length === 1 ? 'task' : 'tasks'}`}
              className={cn('flex flex-col gap-2.5 rounded-lg border border-l-2 border-line bg-card p-3', quadrant.accent)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-fg">{quadrant.title}</h2>
                  <p className="mt-0.5 text-xs text-fg-muted">{quadrant.subtitle}</p>
                </div>
                <Badge variant={quadrant.badgeVariant}>{quadrant.tasks.length}</Badge>
              </div>
              {quadrant.tasks.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {quadrant.tasks.map((task, index) => (
                    <MatrixTaskRow key={taskKey(task, index)} task={task} />
                  ))}
                </ul>
              ) : (
                <div
                  className="flex flex-col items-center gap-1.5 rounded-md border border-dashed border-line px-4 py-5 text-center"
                  role="status"
                >
                  <EmptyIcon className="h-4 w-4 text-fg-subtle" aria-hidden />
                  <span className="text-sm font-medium text-fg-muted">{quadrant.emptyLabel}</span>
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
  // Loads on arrival. The previous page rendered an empty shell until the user
  // pressed "Load matrix", which is a dead end rather than an empty state.
  const query = useMatrixQuery(true);
  const hasData = Boolean(query.data?.ok && query.data.data);
  const canRenderQuadrants = supportsQuadrants(query.data?.data);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
      <SectionTabs items={TASK_VIEW_TABS} ariaLabel="Task view" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-fg">Matrix</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Tasks ranked by urgency and importance, so you can decide what to do next.
          </p>
        </div>
        <Button onClick={() => void query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} aria-hidden />
          {query.isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <QueryState
        isLoading={query.isLoading}
        isError={isQueryError(query.data)}
        isEmpty={!query.isLoading && Boolean(query.data && !query.data.data)}
        emptyMessage="No prioritized tasks yet."
      />

      {hasData &&
        (canRenderQuadrants ? (
          <MatrixQuadrants data={query.data?.data} />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-fg-muted">
              This matrix response is in a shape the UI does not recognise yet. The raw payload is shown so the data is
              never lost.
            </p>
            <pre className="overflow-x-auto rounded-lg border border-line bg-inset p-3 font-mono text-xs text-fg-muted">
              {JSON.stringify(query.data?.data, null, 2)}
            </pre>
          </div>
        ))}
    </div>
  );
}
