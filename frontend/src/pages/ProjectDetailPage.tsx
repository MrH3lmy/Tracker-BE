import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { isQueryError } from '../apiClient';
import { useAnnouncement } from '../announcementContext';
import { QueryState } from '../components/QueryState';
import { ProjectCreateForm, type ProjectCreateFormHandle } from '../components/projects/ProjectCreateForm';
import { ProjectActivityTab } from '../components/projects/ProjectActivityTab';
import { ProjectNotesTab } from '../components/projects/ProjectNotesTab';
import { ProjectTodayTab } from '../components/projects/ProjectTodayTab';
import { ActivityTimelineItem } from '../components/projects/ActivityTimelineItem';
import { projectRiskVariant, projectStatusVariant } from '../components/projects/projectStyleUtils';
import type { MilestoneRecord, ProjectActivityRecord } from '../components/projects/projectTypes';
import { BlockerDisclosure } from '../components/tasks/BlockerDisclosure';
import { ReadinessBadge } from '../components/tasks/ReadinessBadge';
import { taskStatusVariant } from '../components/tasks/taskStyleUtils';
import { formatDate, formatValue } from '../components/tasks/taskUtils';
import type { TaskRecord } from '../components/tasks/taskTypes';
import { NoteCard } from '../components/notes/NoteCard';
import { formatDate as formatNoteDate } from '../components/notes/notesPageHelpers';
import type { NoteRecord } from '../components/notes/noteTypes';
import { formatEnumLabel } from '../lib/enumLabels';
import {
  useMilestoneMutations,
  useProjectActivityQuery,
  useProjectMilestonesQuery,
  useProjectMutations,
  useProjectNotesQuery,
  useProjectOverviewQuery,
  useProjectQuery,
  useProjectTasksQuery,
  useTaskMutations,
} from '../hooks/useApiQueries';
import { Badge, Button, Card, CardHeader, Dialog, Drawer, EmptyState, Field, Input, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronLeft, Clock, Plus, StickyNote, Trash2 } from '../components/ui/icons';

type ReadinessFilter = 'ready' | 'blocked' | 'overdue' | null;

const COMMAND_CENTER_TABS = ['overview', 'today', 'tasks', 'milestones', 'notes', 'activity'] as const;
type CommandCenterTab = (typeof COMMAND_CENTER_TABS)[number];

function isCommandCenterTab(value: string | null): value is CommandCenterTab {
  return COMMAND_CENTER_TABS.includes(value as CommandCenterTab);
}

function isReadinessFilterValue(value: string | null): value is Exclude<ReadinessFilter, null> {
  return value === 'ready' || value === 'blocked' || value === 'overdue';
}

function TaskRow({ task, onUnassign, busy }: { task: TaskRecord; onUnassign: (taskId: number) => void; busy: boolean }) {
  return (
    <li>
      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Link to={`/tasks/${task.id}`} className="min-w-0 truncate text-sm font-medium text-fg hover:underline">{task.title}</Link>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={taskStatusVariant(task.status)}>{formatValue(task.status)}</Badge>
            <ReadinessBadge blocked={task.blocked} ready={task.ready} showReady />
            <Button size="sm" variant="ghost" onClick={() => onUnassign(task.id)} disabled={busy}>Remove</Button>
          </div>
        </div>
        {task.blocked && task.blockers && task.blockers.length > 0 && <BlockerDisclosure blockers={task.blockers} />}
      </Card>
    </li>
  );
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { announce } = useAnnouncement();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneTargetDate, setMilestoneTargetDate] = useState('');
  const editFormRef = useRef<ProjectCreateFormHandle>(null);

  const activeTab: CommandCenterTab = isCommandCenterTab(searchParams.get('tab')) ? (searchParams.get('tab') as CommandCenterTab) : 'overview';
  const readinessParam = searchParams.get('readiness');
  const readinessFilter: ReadinessFilter = isReadinessFilterValue(readinessParam) ? readinessParam : null;

  const goToTab = (tab: CommandCenterTab, filter?: ReadinessFilter) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (filter) next.set('readiness', filter);
    else next.delete('readiness');
    setSearchParams(next, { replace: false });
  };

  const enabled = Number.isFinite(projectId);
  const projectQuery = useProjectQuery(projectId, enabled);
  const overviewQuery = useProjectOverviewQuery(projectId, enabled);
  const milestonesQuery = useProjectMilestonesQuery(projectId, enabled);
  const tasksQuery = useProjectTasksQuery(projectId, enabled);
  const recentActivityQuery = useProjectActivityQuery(projectId, 0, 3, enabled && activeTab === 'overview');
  const recentNotesQuery = useProjectNotesQuery(projectId, undefined, enabled && activeTab === 'overview');

  const { updateProject, deleteProject } = useProjectMutations();
  const { createMilestone, updateMilestone, deleteMilestone } = useMilestoneMutations();
  const { updateTaskProject } = useTaskMutations();

  const project = projectQuery.data?.data;
  const overview = overviewQuery.data?.data;
  const milestones = useMemo<MilestoneRecord[]>(() => (Array.isArray(milestonesQuery.data?.data) ? (milestonesQuery.data.data as MilestoneRecord[]) : []), [milestonesQuery.data]);
  const tasks = useMemo<TaskRecord[]>(() => (Array.isArray(tasksQuery.data?.data) ? (tasksQuery.data.data as TaskRecord[]) : []), [tasksQuery.data]);
  const recentActivity = useMemo<ProjectActivityRecord[]>(() => (Array.isArray(recentActivityQuery.data?.data) ? recentActivityQuery.data.data : []), [recentActivityQuery.data]);
  const recentNotes = useMemo<NoteRecord[]>(() => {
    const notes = Array.isArray(recentNotesQuery.data?.data) ? recentNotesQuery.data.data : [];
    return [...notes].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')).slice(0, 3);
  }, [recentNotesQuery.data]);

  const readyTasks = useMemo(() => tasks.filter((task) => !task.blocked), [tasks]);
  const blockedTasks = useMemo(() => tasks.filter((task) => task.blocked), [tasks]);
  const visibleTasks = useMemo(() => {
    if (readinessFilter === 'ready') return readyTasks;
    if (readinessFilter === 'blocked') return blockedTasks;
    if (readinessFilter === 'overdue') return tasks.filter((task) => task.overdue);
    return tasks;
  }, [readinessFilter, readyTasks, blockedTasks, tasks]);

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

  const nextMilestone = overview?.milestones.find((milestone) => milestone.status !== 'DONE');

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6" aria-busy={busy}>
      <PageHeader
        title={project ? project.name : 'Project detail'}
        description={project?.description || 'Your command center for this project: what to work on, what changed, and what is next.'}
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

          <Tabs value={activeTab} onValueChange={(value) => goToTab(value as CommandCenterTab)}>
            <TabsList aria-label="Project sections" className="overflow-x-auto">
              {/* `!flex-none` overrides TabsTrigger's default equal-width flex-1 (important modifier,
                  not a plain class-order override, since this codebase has no tailwind-merge) -
                  six tabs need their natural width plus horizontal scroll on narrow screens instead
                  of cramming/truncating (design-system/tracker-be/pages/project-command-center.md). */}
              <TabsTrigger value="overview" className="!flex-none !min-w-fit whitespace-nowrap">Overview</TabsTrigger>
              <TabsTrigger value="today" className="!flex-none !min-w-fit whitespace-nowrap">Today</TabsTrigger>
              <TabsTrigger value="tasks" className="!flex-none !min-w-fit whitespace-nowrap">Tasks {tasks.length > 0 && `(${tasks.length})`}</TabsTrigger>
              <TabsTrigger value="milestones" className="!flex-none !min-w-fit whitespace-nowrap">Milestones {milestones.length > 0 && `(${milestones.length})`}</TabsTrigger>
              <TabsTrigger value="notes" className="!flex-none !min-w-fit whitespace-nowrap">Notes</TabsTrigger>
              <TabsTrigger value="activity" className="!flex-none !min-w-fit whitespace-nowrap">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 flex flex-col gap-4">
              <QueryState isLoading={overviewQuery.isLoading} isError={isQueryError(overviewQuery.data)} isEmpty={false} />
              {overview && (
                <>
                  {/* Instrument cluster (issue #296 review): project health + ready/blocked/overdue
                      merged into one panel instead of a Progress card followed by three separate
                      stat tiles - this is the "prominent health header + high-signal readiness area"
                      the review asked for. */}
                  <section className="overflow-hidden rounded-2xl border border-line bg-card">
                    <div className="flex flex-col gap-4 bg-brand-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--app-brand) ${overview.progressPercent * 3.6}deg, var(--app-line) 0deg)` }}>
                          <div className="absolute inset-1.5 rounded-full bg-card" aria-hidden />
                          <span className="relative font-mono text-sm font-bold text-fg">{overview.progressPercent}%</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold tracking-wider text-fg-subtle uppercase">Project health</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge variant={projectRiskVariant(overview.riskLevel)}>{formatEnumLabel(overview.riskLevel)} risk</Badge>
                            <span className="text-sm text-fg-muted">{overview.completedTasks} of {overview.totalTasks} tasks complete</span>
                          </div>
                        </div>
                      </div>
                      <p className="max-w-sm text-sm text-fg-muted sm:text-right">{overview.riskReason}</p>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
                      <button type="button" onClick={() => goToTab('tasks', 'ready')} className="flex min-h-11 flex-col items-center gap-1 px-3 py-4 text-center transition-colors duration-(--duration-fast) hover:bg-inset">
                        <CheckCircle2 className="h-4 w-4 text-brand" aria-hidden />
                        <span className="font-mono text-2xl font-bold text-brand tabular-nums">{readyTasks.length}</span>
                        <span className="text-xs font-medium text-fg-muted">Ready to work</span>
                      </button>
                      <button type="button" onClick={() => goToTab('tasks', 'blocked')} className="flex min-h-11 flex-col items-center gap-1 px-3 py-4 text-center transition-colors duration-(--duration-fast) hover:bg-inset">
                        <AlertTriangle className="h-4 w-4 text-caution" aria-hidden />
                        <span className="font-mono text-2xl font-bold text-caution tabular-nums">{blockedTasks.length}</span>
                        <span className="text-xs font-medium text-fg-muted">Blocked</span>
                      </button>
                      <button type="button" onClick={() => goToTab('tasks', 'overdue')} className="flex min-h-11 flex-col items-center gap-1 px-3 py-4 text-center transition-colors duration-(--duration-fast) hover:bg-inset">
                        <Clock className="h-4 w-4 text-critical" aria-hidden />
                        <span className="font-mono text-2xl font-bold text-critical tabular-nums">{overview.overdueTasks}</span>
                        <span className="text-xs font-medium text-fg-muted">Overdue</span>
                      </button>
                    </div>
                  </section>

                  {/* Main / secondary column split (issue #296 review) - milestone + effort stay in the
                      primary flow, activity and notes move into a supporting sidebar. */}
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                    <div className="flex min-w-0 flex-col gap-4">
                      <Card>
                        <CardHeader
                          title="Next milestone"
                          description={nextMilestone ? `${nextMilestone.title}${nextMilestone.targetDate ? ` · Target ${formatDate(nextMilestone.targetDate)}` : ''}` : 'All milestones complete.'}
                          actions={<Button size="sm" variant="ghost" onClick={() => goToTab('milestones')}>View all <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Button>}
                        />
                        <p className="text-sm text-fg-muted">{overview.completedMilestones} of {overview.milestones.length} milestones complete.</p>
                      </Card>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Card className="text-center">
                          <p className="font-mono text-lg font-bold text-fg">{overview.activeTasks}</p>
                          <p className="text-xs text-fg-muted">Active tasks</p>
                        </Card>
                        <Card className="text-center">
                          <p className="font-mono text-lg font-bold text-critical">{overview.overdueTasks}</p>
                          <p className="text-xs text-fg-muted">Overdue</p>
                        </Card>
                        <Card className="text-center">
                          <p className="font-mono text-lg font-bold text-fg">{overview.estimatedHours.toFixed(1)}h</p>
                          <p className="text-xs text-fg-muted">Estimated</p>
                        </Card>
                        <Card className="text-center">
                          <p className="font-mono text-lg font-bold text-fg">{overview.actualHours.toFixed(1)}h</p>
                          <p className="text-xs text-fg-muted">Actual</p>
                        </Card>
                      </div>
                    </div>

                    <aside className="flex flex-col gap-4">
                      <Card>
                        <CardHeader title="Recent activity" actions={<Button size="sm" variant="ghost" onClick={() => goToTab('activity')}>View all <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Button>} />
                        {recentActivityQuery.isLoading ? (
                          <p className="text-sm text-fg-muted">Loading...</p>
                        ) : recentActivity.length === 0 ? (
                          <p className="text-sm text-fg-subtle">No activity yet.</p>
                        ) : (
                          <ul className="flex flex-col gap-3">
                            {recentActivity.map((entry) => <ActivityTimelineItem key={entry.id} entry={entry} />)}
                          </ul>
                        )}
                      </Card>

                      <Card>
                        <CardHeader title="Recent notes" actions={<Button size="sm" variant="ghost" onClick={() => goToTab('notes')}>View all <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Button>} />
                        {recentNotesQuery.isLoading ? (
                          <p className="text-sm text-fg-muted">Loading...</p>
                        ) : recentNotes.length === 0 ? (
                          <EmptyState
                            icon={StickyNote}
                            title="No project notes yet"
                            description="Capture meeting notes, decisions, or research for this project."
                            action={<Link to={`/notes?projectId=${projectId}`}><Button size="sm" variant="primary"><Plus className="h-4 w-4" aria-hidden />Create project note</Button></Link>}
                          />
                        ) : (
                          <div className="flex flex-col gap-3">
                            {recentNotes.map((note) => (
                              <NoteCard
                                key={note.id}
                                note={note}
                                layout="row"
                                subtitle={<p className="text-sm text-fg-muted">Updated {formatNoteDate(note.updatedAt)}</p>}
                                actions={<Link to={`/notes?projectId=${projectId}&q=${encodeURIComponent(note.title)}`} className="text-sm font-medium text-brand hover:underline">Open in Notes</Link>}
                              />
                            ))}
                          </div>
                        )}
                      </Card>
                    </aside>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="today" className="mt-4">
              {Number.isFinite(projectId) && <ProjectTodayTab projectId={projectId} />}
            </TabsContent>

            <TabsContent value="tasks" className="mt-4 flex flex-col gap-4">
              {readinessFilter && (
                <div className="flex items-center gap-2">
                  <Badge variant="brand">Filtered: {readinessFilter[0].toUpperCase()}{readinessFilter.slice(1)}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => goToTab('tasks')}>Clear filter</Button>
                </div>
              )}
              <QueryState
                isLoading={tasksQuery.isLoading}
                isError={isQueryError(tasksQuery.data)}
                isEmpty={!tasksQuery.isLoading && visibleTasks.length === 0}
                emptyMessage={tasks.length === 0 ? 'No tasks assigned to this project yet. Assign tasks from the task form’s Project field.' : 'No tasks match this filter.'}
              />

              {visibleTasks.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {visibleTasks.map((task) => <TaskRow key={task.id} task={task} onUnassign={unassignTask} busy={busy} />)}
                </ul>
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

            <TabsContent value="notes" className="mt-4">
              {Number.isFinite(projectId) && <ProjectNotesTab projectId={projectId} />}
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              {Number.isFinite(projectId) && <ProjectActivityTab projectId={projectId} />}
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
