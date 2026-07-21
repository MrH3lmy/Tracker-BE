import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isQueryError } from '../apiClient';
import { useAnnouncement } from '../announcementContext';
import { QueryState } from '../components/QueryState';
import { ProjectCreateForm, type ProjectCreateFormHandle } from '../components/projects/ProjectCreateForm';
import { projectRiskVariant, projectStatusVariant } from '../components/projects/projectStyleUtils';
import type { MilestoneRecord } from '../components/projects/projectTypes';
import { taskStatusVariant } from '../components/tasks/taskStyleUtils';
import { formatDate, formatValue } from '../components/tasks/taskUtils';
import type { TaskRecord } from '../components/tasks/taskTypes';
import { formatEnumLabel } from '../lib/enumLabels';
import {
  useMilestoneMutations,
  useProjectMilestonesQuery,
  useProjectMutations,
  useProjectOverviewQuery,
  useProjectQuery,
  useProjectTasksQuery,
  useTaskMutations,
} from '../hooks/useApiQueries';
import { Badge, Button, Card, CardHeader, Dialog, Drawer, Field, Input, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui';
import { ChevronLeft, Plus, Trash2 } from '../components/ui/icons';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { announce } = useAnnouncement();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneTargetDate, setMilestoneTargetDate] = useState('');
  const editFormRef = useRef<ProjectCreateFormHandle>(null);

  const enabled = Number.isFinite(projectId);
  const projectQuery = useProjectQuery(projectId, enabled);
  const overviewQuery = useProjectOverviewQuery(projectId, enabled);
  const milestonesQuery = useProjectMilestonesQuery(projectId, enabled);
  const tasksQuery = useProjectTasksQuery(projectId, enabled);

  const { updateProject, deleteProject } = useProjectMutations();
  const { createMilestone, updateMilestone, deleteMilestone } = useMilestoneMutations();
  const { updateTaskProject } = useTaskMutations();

  const project = projectQuery.data?.data;
  const overview = overviewQuery.data?.data;
  const milestones = useMemo<MilestoneRecord[]>(() => (Array.isArray(milestonesQuery.data?.data) ? (milestonesQuery.data.data as MilestoneRecord[]) : []), [milestonesQuery.data]);
  const tasks = useMemo<TaskRecord[]>(() => (Array.isArray(tasksQuery.data?.data) ? (tasksQuery.data.data as TaskRecord[]) : []), [tasksQuery.data]);

  const isLoading = projectQuery.isLoading || projectQuery.isFetching;
  const hasError = isQueryError(projectQuery.data);
  const busy = updateProject.isPending || deleteProject.isPending || createMilestone.isPending || updateMilestone.isPending || deleteMilestone.isPending || updateTaskProject.isPending;

  const showEditPanel = () => {
    setEditOpen(true);
    window.requestAnimationFrame(() => editFormRef.current?.focusName());
  };

  const submitEdit = (payload: Parameters<typeof updateProject.mutate>[0]['body'], onSuccess: () => void) => {
    if (!project) return;
    updateProject.mutate({ id: project.id, body: payload }, {
      onSuccess: (result) => {
        announce(result.ok ? 'Project updated successfully.' : (result.error?.message ?? 'Project update failed.'));
        if (result.ok) { onSuccess(); setEditOpen(false); }
      },
    });
  };

  const confirmDelete = () => {
    if (!project) return;
    deleteProject.mutate(project.id, {
      onSuccess: (result) => {
        if (result.ok) navigate('/tasks/projects');
        announce(result.ok ? 'Project deleted successfully.' : (result.error?.message ?? 'Project deletion failed.'));
      },
    });
  };

  const submitMilestone = () => {
    if (!milestoneTitle.trim() || !Number.isFinite(projectId)) return;
    createMilestone.mutate({ projectId, body: { title: milestoneTitle.trim(), targetDate: milestoneTargetDate || undefined } }, {
      onSuccess: (result) => {
        if (result.ok) { setMilestoneTitle(''); setMilestoneTargetDate(''); }
        announce(result.ok ? 'Milestone added.' : (result.error?.message ?? 'Milestone creation failed.'));
      },
    });
  };

  const toggleMilestone = (milestone: MilestoneRecord) => {
    const nextStatus = milestone.status === 'DONE' ? 'PENDING' : 'DONE';
    updateMilestone.mutate({ projectId, milestoneId: milestone.id, body: { title: milestone.title, targetDate: milestone.targetDate, status: nextStatus } });
  };

  const removeMilestone = (milestoneId: number) => {
    deleteMilestone.mutate({ projectId, milestoneId });
  };

  const unassignTask = (taskId: number) => {
    updateTaskProject.mutate({ id: taskId, projectId: null });
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6" aria-busy={busy}>
      <PageHeader
        title={project ? project.name : 'Project detail'}
        description={project?.description || 'Overview, milestones, and tasks for this project.'}
        actions={
          <>
            <Button onClick={() => navigate('/tasks/projects')}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Back to projects
            </Button>
            {project && <Button onClick={showEditPanel} disabled={busy}>Edit</Button>}
            {project && <Button variant="danger" onClick={() => setDeleteOpen(true)} disabled={busy}><Trash2 className="h-4 w-4" aria-hidden />Delete</Button>}
          </>
        }
        className="mb-0"
      />

      <QueryState isLoading={isLoading} isError={hasError} isEmpty={!isLoading && !hasError && !project} emptyMessage="Project not found." />

      {project && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={projectStatusVariant(project.status)}>{formatEnumLabel(project.status)}</Badge>
            {project.area && <Badge variant="outline">{formatEnumLabel(project.area)}</Badge>}
            {project.targetDate && <span className="text-sm text-fg-muted">Target: {formatDate(project.targetDate)}</span>}
          </div>

          <Tabs defaultValue="overview">
            <TabsList aria-label="Project sections">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="milestones">Milestones {milestones.length > 0 && `(${milestones.length})`}</TabsTrigger>
              <TabsTrigger value="tasks">Tasks {tasks.length > 0 && `(${tasks.length})`}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 flex flex-col gap-4">
              <QueryState isLoading={overviewQuery.isLoading} isError={isQueryError(overviewQuery.data)} isEmpty={false} />
              {overview && (
                <>
                  <Card className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-fg">Progress</p>
                      <Badge variant={projectRiskVariant(overview.riskLevel)}>{formatEnumLabel(overview.riskLevel)} risk</Badge>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-fg">{overview.progressPercent}%</span>
                      <span className="text-sm text-fg-muted">{overview.completedTasks} of {overview.totalTasks} tasks complete</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-inset" role="progressbar" aria-valuenow={overview.progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Project progress">
                      <div className="h-full rounded-full bg-brand transition-[width] duration-(--duration-base)" style={{ width: `${overview.progressPercent}%` }} />
                    </div>
                    <p className="text-sm text-fg-muted">{overview.riskReason}</p>
                  </Card>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Card className="text-center">
                      <p className="text-lg font-bold text-fg">{overview.activeTasks}</p>
                      <p className="text-xs text-fg-muted">Active tasks</p>
                    </Card>
                    <Card className="text-center">
                      <p className="text-lg font-bold text-critical">{overview.overdueTasks}</p>
                      <p className="text-xs text-fg-muted">Overdue</p>
                    </Card>
                    <Card className="text-center">
                      <p className="text-lg font-bold text-fg">{overview.estimatedHours.toFixed(1)}h</p>
                      <p className="text-xs text-fg-muted">Estimated</p>
                    </Card>
                    <Card className="text-center">
                      <p className="text-lg font-bold text-fg">{overview.actualHours.toFixed(1)}h</p>
                      <p className="text-xs text-fg-muted">Actual</p>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader title="Milestones" description={`${overview.completedMilestones} of ${overview.milestones.length} complete`} />
                    {overview.milestones.length === 0 ? (
                      <p className="text-sm text-fg-muted">No milestones yet.</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {overview.milestones.map((milestone) => (
                          <li key={milestone.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className={milestone.status === 'DONE' ? 'text-fg-muted line-through' : 'text-fg'}>{milestone.title}</span>
                            <span className="text-xs text-fg-subtle">{milestone.targetDate ? formatDate(milestone.targetDate) : '—'}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="milestones" className="mt-4 flex flex-col gap-4">
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field label="New milestone" htmlFor="newMilestoneTitle" className="flex-1">
                  <Input id="newMilestoneTitle" placeholder="Beta launch" value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} disabled={busy} />
                </Field>
                <Field label="Target date" htmlFor="newMilestoneDate">
                  <Input id="newMilestoneDate" type="date" value={milestoneTargetDate} onChange={(e) => setMilestoneTargetDate(e.target.value)} disabled={busy} />
                </Field>
                <Button variant="primary" onClick={submitMilestone} disabled={busy || !milestoneTitle.trim()}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add
                </Button>
              </Card>

              <QueryState isLoading={milestonesQuery.isLoading} isError={isQueryError(milestonesQuery.data)} isEmpty={!milestonesQuery.isLoading && milestones.length === 0} emptyMessage="No milestones yet." />

              {milestones.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {milestones.map((milestone) => (
                    <li key={milestone.id}>
                      <Card className="flex items-center justify-between gap-3">
                        <label className="flex min-w-0 items-center gap-2">
                          <input type="checkbox" checked={milestone.status === 'DONE'} onChange={() => toggleMilestone(milestone)} disabled={busy} aria-label={`Mark ${milestone.title} ${milestone.status === 'DONE' ? 'pending' : 'done'}`} />
                          <span className={`truncate text-sm ${milestone.status === 'DONE' ? 'text-fg-muted line-through' : 'text-fg'}`}>{milestone.title}</span>
                        </label>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-fg-subtle">{milestone.targetDate ? formatDate(milestone.targetDate) : 'No date'}</span>
                          <Button size="sm" variant="ghost" iconOnly aria-label={`Delete milestone ${milestone.title}`} onClick={() => removeMilestone(milestone.id)} disabled={busy}>
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="mt-4 flex flex-col gap-4">
              <QueryState isLoading={tasksQuery.isLoading} isError={isQueryError(tasksQuery.data)} isEmpty={!tasksQuery.isLoading && tasks.length === 0} emptyMessage="No tasks assigned to this project yet. Assign tasks from the task form's Project field." />

              {tasks.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {tasks.map((task) => (
                    <li key={task.id}>
                      <Card className="flex items-center justify-between gap-3">
                        <Link to={`/tasks/${task.id}`} className="min-w-0 truncate text-sm font-medium text-fg hover:underline">{task.title}</Link>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant={taskStatusVariant(task.status)}>{formatValue(task.status)}</Badge>
                          <Button size="sm" variant="ghost" onClick={() => unassignTask(task.id)} disabled={busy}>Remove</Button>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      <Drawer
        open={editOpen}
        onOpenChange={(open) => { if (!open) setEditOpen(false); }}
        title="Edit project"
      >
        <ProjectCreateForm
          ref={editFormRef}
          mode="edit"
          initialValue={project ?? undefined}
          busy={updateProject.isPending}
          isSubmitting={updateProject.isPending}
          onCancel={() => setEditOpen(false)}
          onSubmit={submitEdit}
          onInvalidName={() => setEditOpen(true)}
        />
      </Drawer>

      <Dialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete project?"
        description={`"${project?.name ?? ''}" will be removed. Its tasks stay in place and just lose their project assignment.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleteProject.isPending}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleteProject.isPending}>{deleteProject.isPending ? 'Deleting...' : 'Delete project'}</Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">This can&apos;t be undone.</p>
      </Dialog>
    </div>
  );
}
