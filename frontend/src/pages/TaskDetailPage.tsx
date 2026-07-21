import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isQueryError } from '../apiClient';
import { useAnnouncement } from '../announcementContext';
import { QueryState } from '../components/QueryState';
import { ManageDependenciesDrawer } from '../components/tasks/ManageDependenciesDrawer';
import { TaskCreateForm } from '../components/tasks/TaskCreateForm';
import { buildTaskUpdateBody } from '../components/tasks/buildTaskUpdateBody';
import type { CreateTaskPayload, TaskRecord } from '../components/tasks/taskTypes';
import type { ProjectRecord } from '../components/projects/projectTypes';
import { useProjectsQuery, useTaskDetailQuery, useTaskMutations, useTasksQuery } from '../hooks/useApiQueries';
import { Button, Card, CardHeader, PageHeader } from '../components/ui';
import { ChevronLeft } from '../components/ui/icons';

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

  const detail = detailQuery.data?.data;
  const task = detail?.task;
  const activeData = activeQuery.data?.data;
  const activeTasks = Array.isArray(activeData) ? (activeData as TaskRecord[]) : [];
  const projects = useMemo<ProjectRecord[]>(() => (Array.isArray(projectsQuery.data?.data) ? (projectsQuery.data.data as ProjectRecord[]) : []), [projectsQuery.data]);

  useEffect(() => {
    if (!task) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing the project picker to a newly-loaded task, not deriving render state.
    setEditProjectId(task.projectId != null ? String(task.projectId) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync only when a different task loads, not on every task field change.
  }, [task?.id]);

  const isLoading = detailQuery.isLoading || detailQuery.isFetching;
  const hasError = isQueryError(detailQuery.data);
  const busy = updateTask.isPending || addDependency.isPending || removeDependency.isPending || updateTaskProject.isPending;

  const handleSubmit = (payload: CreateTaskPayload, onSuccess: () => void) => {
    if (!task) return;
    updateTask.mutate({ id: task.id, body: buildTaskUpdateBody(task, payload) }, {
      onSuccess: (result) => {
        announce(result.ok ? 'Task updated successfully.' : (result.error?.message ?? 'Task update failed.'));
        if (!result.ok) return;
        const nextProjectId = editProjectId ? Number(editProjectId) : null;
        if (nextProjectId !== (task.projectId ?? null)) updateTaskProject.mutate({ id: task.id, projectId: nextProjectId });
        onSuccess();
      },
    });
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
    addDependency.mutate({ id: depId, blocksTaskId }, { onSuccess: (result) => { if (result.ok) setDependenciesOpen(false); } });
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6" aria-busy={busy}>
      <PageHeader
        title={task ? `#${task.id} ${task.title}` : 'Task detail'}
        description="Edit task details, manage dependencies, and review linked notes."
        actions={
          <Button onClick={() => navigate('/tasks')}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Back to tasks
          </Button>
        }
        className="mb-0"
      />

      <QueryState
        isLoading={isLoading}
        isError={hasError}
        isEmpty={!isLoading && !hasError && !task}
        emptyMessage="Task not found."
      />

      {task && (
        <>
          <Card>
            <CardHeader title="Details" />
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
          </Card>

          <Card>
            <CardHeader
              title="Dependencies"
              actions={<Button size="sm" variant="ghost" onClick={openDependencyManager} disabled={busy}>Manage dependencies</Button>}
            />
            <dl className="flex flex-col gap-1 text-sm">
              <div className="flex gap-2"><dt className="w-24 shrink-0 text-fg-muted">Blocked by</dt><dd className="text-fg">{task.dependencyIds?.map((depId) => `#${depId}`).join(', ') || '—'}</dd></div>
              <div className="flex gap-2"><dt className="w-24 shrink-0 text-fg-muted">Blocks</dt><dd className="text-fg">{task.blockingTaskIds?.map((depId) => `#${depId}`).join(', ') || '—'}</dd></div>
            </dl>
            {task.dependencyIds?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label={`Dependency actions for ${task.title}`}>
                {task.dependencyIds.map((blocksTaskId) => (
                  <Button key={blocksTaskId} size="sm" onClick={() => removeDependency.mutate({ id: task.id, blocksTaskId })} disabled={busy}>
                    Unlink #{blocksTaskId}
                  </Button>
                ))}
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader
              title="Linked notes"
              actions={
                <a className="text-sm font-medium text-brand hover:underline" href={`/notes?taskId=${encodeURIComponent(String(task.id))}`}>
                  {detail?.notes?.length ? `${detail.notes.length} note${detail.notes.length === 1 ? '' : 's'}` : 'View notes'}
                </a>
              }
            />
            <p className="text-sm text-fg-subtle">Open the linked notes panel to jump into notes connected to this task.</p>
          </Card>
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
