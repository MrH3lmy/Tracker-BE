import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isQueryError } from '../apiClient';
import { useAnnouncement } from '../announcementContext';
import { QueryState } from '../components/QueryState';
import { BlockerDisclosure } from '../components/tasks/BlockerDisclosure';
import { ManageDependenciesDrawer } from '../components/tasks/ManageDependenciesDrawer';
import { TaskCreateForm } from '../components/tasks/TaskCreateForm';
import { buildTaskUpdateBody } from '../components/tasks/buildTaskUpdateBody';
import type { CreateTaskPayload, TaskRecord } from '../components/tasks/taskTypes';
import type { ProjectRecord } from '../components/projects/projectTypes';
import {
  useFocusSessionMutations,
  useProjectsQuery,
  useTaskDetailQuery,
  useTaskMutations,
  useTasksQuery,
} from '../hooks/useApiQueries';
import { Badge, Button, Collapsible, cn } from '../components/ui';
import { AlertTriangle, CheckCircle2, ChevronLeft, FileText, Timer, X } from '../components/ui/icons';

/**
 * Readiness, stated plainly and first.
 *
 * `task.blocked` and `task.ready` are independent backend facts -- a WAITING task
 * can be ready, and a NOT_STARTED task can be blocked -- so neither is ever
 * derived from the other, and "neither flag set" is rendered as its own case
 * rather than being folded into "ready".
 *
 * `color-not-only`: each state is an icon plus a sentence, not a coloured bar.
 */
function ReadinessPanel({ task, children }: { task: TaskRecord; children?: React.ReactNode }) {
  const isBlocked = task.blocked === true;
  const isReady = !isBlocked && task.ready === true;

  return (
    <section
      aria-label="Readiness"
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-l-2 p-3',
        isBlocked && 'border-line border-l-caution bg-caution-soft',
        isReady && 'border-line border-l-positive bg-card',
        !isBlocked && !isReady && 'border-line border-l-line-strong bg-card',
      )}
    >
      <div className="flex items-start gap-2">
        {isBlocked ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-caution" aria-hidden />
        ) : isReady ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-positive" aria-hidden />
        ) : (
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
        )}
        <p className="text-sm text-fg">
          {isBlocked ? (
            <>
              <strong className="font-semibold">Blocked.</strong> This task is waiting on work that is not finished yet.
            </>
          ) : isReady ? (
            <>
              <strong className="font-semibold">Ready to start.</strong> Nothing is blocking this task.
            </>
          ) : (
            <>
              <strong className="font-semibold">No readiness reported.</strong> This task has no dependency information.
            </>
          )}
        </p>
      </div>
      {children}
    </section>
  );
}

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const taskId = Number(id);
  const navigate = useNavigate();
  const { announce } = useAnnouncement();
  const [dependenciesOpen, setDependenciesOpen] = useState(false);
  const [dependencyTaskId, setDependencyTaskId] = useState('');
  const [dependencyBlocksTaskId, setDependencyBlocksTaskId] = useState('');
  const [editProjectId, setEditProjectId] = useState('');

  const detailQuery = useTaskDetailQuery(taskId, Number.isFinite(taskId));
  const activeQuery = useTasksQuery('active');
  const projectsQuery = useProjectsQuery();
  const { updateTask, addDependency, removeDependency, updateTaskProject } = useTaskMutations();
  const { startSession } = useFocusSessionMutations();

  const detail = detailQuery.data?.data;
  const task = detail?.task;
  const activeData = activeQuery.data?.data;
  const activeTasks = Array.isArray(activeData) ? (activeData as TaskRecord[]) : [];
  const projects = useMemo<ProjectRecord[]>(
    () => (Array.isArray(projectsQuery.data?.data) ? (projectsQuery.data.data as ProjectRecord[]) : []),
    [projectsQuery.data],
  );

  useEffect(() => {
    if (!task) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing the project picker to a newly-loaded task, not deriving render state.
    setEditProjectId(task.projectId != null ? String(task.projectId) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync only when a different task loads, not on every task field change.
  }, [task?.id]);

  const isLoading = detailQuery.isLoading || detailQuery.isFetching;
  const hasError = isQueryError(detailQuery.data);
  const busy =
    updateTask.isPending || addDependency.isPending || removeDependency.isPending || updateTaskProject.isPending;
  const noteCount = detail?.notes?.length ?? 0;

  const handleSubmit = (payload: CreateTaskPayload, onSuccess: () => void) => {
    if (!task) return;
    updateTask.mutate(
      { id: task.id, body: buildTaskUpdateBody(task, payload) },
      {
        onSuccess: (result) => {
          announce(result.ok ? 'Task updated successfully.' : (result.error?.message ?? 'Task update failed.'));
          if (!result.ok) return;
          const nextProjectId = editProjectId ? Number(editProjectId) : null;
          if (nextProjectId !== (task.projectId ?? null))
            updateTaskProject.mutate({ id: task.id, projectId: nextProjectId });
          onSuccess();
        },
      },
    );
  };

  const openDependencyManager = () => {
    if (!task) return;
    setDependencyTaskId(String(task.id));
    setDependencyBlocksTaskId('');
    setDependenciesOpen(true);
  };

  const submitDependency = () => {
    const depId = Number(dependencyTaskId);
    const blocksTaskId = Number(dependencyBlocksTaskId);
    if (!Number.isFinite(depId) || !Number.isFinite(blocksTaskId) || depId === blocksTaskId) return;
    addDependency.mutate(
      { id: depId, blocksTaskId },
      {
        onSuccess: (result) => {
          announce(result.ok ? 'Dependency added.' : (result.error?.message ?? 'Could not add dependency.'));
          if (result.ok) setDependenciesOpen(false);
        },
      },
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5 sm:px-6" aria-busy={busy}>
      <Link
        to="/tasks"
        className="inline-flex min-h-8 w-fit items-center gap-1 rounded-md text-sm font-medium text-fg-muted transition-colors duration-(--duration-fast) hover:text-fg"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        All tasks
      </Link>

      <QueryState
        isLoading={isLoading}
        isError={hasError}
        isEmpty={!isLoading && !hasError && !task}
        emptyMessage="Task not found."
      />

      {task && (
        <>
          <header className="flex flex-col gap-2">
            {/* The title wraps: it is the task's distinguishing name and must stay
                complete at every width. */}
            <h1 className="text-xl font-semibold tracking-tight break-words text-fg">{task.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Task #{task.id}</Badge>
              {task.important && <Badge variant="caution">Important</Badge>}
              {task.status !== 'DONE' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    startSession.mutate(task.id, {
                      onSuccess: (result) =>
                        announce(
                          result.ok
                            ? `Focus session started for "${task.title}".`
                            : (result.error?.message ?? 'Could not start focus session.'),
                        ),
                    })
                  }
                  disabled={startSession.isPending}
                  className="ml-auto"
                >
                  <Timer className="h-4 w-4" aria-hidden />
                  {startSession.isPending ? 'Starting…' : 'Start focus session'}
                </Button>
              )}
            </div>
          </header>

          {/* Readiness comes first: it decides whether this task can be worked at
              all, so it outranks the edit form on the page. */}
          <ReadinessPanel task={task}>
            {task.blocked && task.blockers && task.blockers.length > 0 && (
              <BlockerDisclosure blockers={task.blockers} defaultOpen />
            )}
          </ReadinessPanel>

          <section aria-label="Dependencies" className="flex flex-col gap-2.5 rounded-lg border border-line bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-fg">Dependencies</h2>
                {/*
                  `dependencyIds`/`blockingTaskIds` are the declared edges of the
                  dependency graph; `blockers` above is the backend's computed list
                  of edges that are still unfinished. They are different fields and
                  can legitimately differ -- a task with dependencies that are all
                  done has edges here and no blockers above -- so each is labelled
                  for what it is rather than left to look contradictory.
                */}
                <p className="mt-0.5 text-xs text-fg-muted">
                  Every declared link. Only the unfinished ones block this task.
                </p>
              </div>
              <Button size="sm" onClick={openDependencyManager} disabled={busy}>
                Manage dependencies
              </Button>
            </div>

            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium tracking-wide text-fg-subtle uppercase">Blocked by</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {task.dependencyIds?.length ? (
                    task.dependencyIds.map((depId) => (
                      <span key={depId} className="inline-flex items-center gap-0.5 rounded-md border border-line bg-inset pl-2">
                        <Link to={`/tasks/${depId}`} className="py-1 text-sm text-fg hover:underline">
                          #{depId}
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            removeDependency.mutate(
                              { id: task.id, blocksTaskId: depId },
                              {
                                onSuccess: (result) =>
                                  announce(
                                    result.ok
                                      ? `Dependency on #${depId} removed.`
                                      : (result.error?.message ?? 'Could not remove dependency.'),
                                  ),
                              },
                            )
                          }
                          disabled={busy}
                          aria-label={`Remove dependency on task #${depId}`}
                          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-fg-subtle hover:bg-card hover:text-critical disabled:pointer-events-none disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-fg-subtle">Nothing</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-fg-subtle uppercase">Blocks</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {task.blockingTaskIds?.length ? (
                    task.blockingTaskIds.map((depId) => (
                      <Link
                        key={depId}
                        to={`/tasks/${depId}`}
                        className="rounded-md border border-line bg-inset px-2 py-1 text-sm text-fg hover:underline"
                      >
                        #{depId}
                      </Link>
                    ))
                  ) : (
                    <span className="text-fg-subtle">Nothing</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {/*
            Progressive disclosure: the full field set is a long form, and most
            visits to a task are to read its state rather than to rewrite it. It
            stays one interaction away instead of dominating the page.
          */}
          <Collapsible
            defaultOpen
            className="rounded-lg border border-line bg-card p-3"
            title={<span className="text-sm font-semibold text-fg">Edit task</span>}
          >
            <div className="pt-2">
              <TaskCreateForm
                mode="edit"
                initialValue={task}
                activeTasks={activeTasks}
                projects={projects}
                projectId={editProjectId}
                onProjectIdChange={setEditProjectId}
                busy={busy}
                isSubmitting={updateTask.isPending}
                onCancel={() => navigate('/tasks')}
                onSubmit={handleSubmit}
                onInvalidTitle={() => {}}
              />
            </div>
          </Collapsible>

          <section aria-label="Linked notes" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-card p-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-fg">Linked notes</h2>
              <p className="mt-0.5 text-sm text-fg-muted">
                {noteCount > 0
                  ? `${noteCount} note${noteCount === 1 ? '' : 's'} connected to this task.`
                  : 'No notes are linked to this task yet.'}
              </p>
            </div>
            <Link
              to={`/notes?taskId=${encodeURIComponent(String(task.id))}`}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-line-control px-3 text-sm font-medium text-fg transition-colors duration-(--duration-fast) hover:bg-inset"
            >
              <FileText className="h-4 w-4" aria-hidden />
              {noteCount > 0 ? 'Open notes' : 'Link a note'}
            </Link>
          </section>
        </>
      )}

      {dependenciesOpen && (
        <ManageDependenciesDrawer
          activeTasks={activeTasks}
          busy={busy}
          dependencyTaskId={dependencyTaskId}
          dependencyBlocksTaskId={dependencyBlocksTaskId}
          setDependencyTaskId={setDependencyTaskId}
          setDependencyBlocksTaskId={setDependencyBlocksTaskId}
          submitDependency={submitDependency}
          onClose={() => setDependenciesOpen(false)}
        />
      )}
    </div>
  );
}
