import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isQueryError, type ApiCallResult } from '../apiClient';
import { useAnnouncement } from '../announcementContext';
import { useUndoToast } from '../undoToastContext';
import { formatEnumLabel } from '../lib/enumLabels';
import { TaskCreateForm, type TaskCreateFormHandle } from '../components/tasks/TaskCreateForm';
import { ManageDependenciesDrawer } from '../components/tasks/ManageDependenciesDrawer';
import { TaskActiveFilters, type ActiveFilterChip } from '../components/tasks/TaskActiveFilters';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { TaskListEmpty, TaskListError, TaskListSkeleton, type TaskScope } from '../components/tasks/TaskListStates';
import { TaskListView } from '../components/tasks/TaskListView';
import { TaskSavedViews } from '../components/tasks/TaskSavedViews';
import { TaskWorkspaceRail } from '../components/tasks/TaskWorkspaceRail';
import { buildTaskUpdateBody } from '../components/tasks/buildTaskUpdateBody';
import {
  TASK_LENS_LABEL,
  TASK_SIGNAL_LABEL,
  TASK_SIGNAL_VALUES,
  countTaskLenses,
  countTaskSignals,
  isTaskLens,
  matchesLens,
  matchesSignal,
  type TaskLens,
  type TaskSignal,
} from '../components/tasks/taskLenses';
import type { CreateTaskPayload, FilterValue, TaskRecord, TaskSortValue } from '../components/tasks/taskTypes';
import { buildTaskTree, taskMatchesSearch, uniqueOptions } from '../components/tasks/taskUtils';
import type { ProjectRecord } from '../components/projects/projectTypes';
import { latestResult, useFocusSessionMutations, useProjectsQuery, useTaskMutations, useTasksQuery } from '../hooks/useApiQueries';
import { Badge, Button, Drawer, Input, Popover, PopoverContent, PopoverTrigger, SegmentedControl, Select } from '../components/ui';
import { Filter, Plus, Search } from '../components/ui/icons';
import { SectionTabs } from '../components/SectionTabs';
import { TASK_VIEW_TABS } from '../router/routes';

const DEFAULT_SORT: TaskSortValue = 'position';
/** Everything a saved view captures. Order matters only for readability. */
const FILTER_PARAM_KEYS = ['q', 'readiness', 'overdue', 'followUp', 'important', 'status', 'project', 'area', 'effort', 'dueFrom', 'dueTo', 'sort'] as const;
const POPOVER_FILTER_KEYS = ['status', 'project', 'area', 'effort', 'dueFrom', 'dueTo'] as const;
const SORT_VALUES: TaskSortValue[] = ['position', 'priorityScore', 'dueDate', 'createdDate', 'effort', 'title'];
const SORT_LABEL: Record<TaskSortValue, string> = {
  position: 'Board position',
  priorityScore: 'Priority score',
  dueDate: 'Due date',
  createdDate: 'Created date',
  effort: 'Effort',
  title: 'Title',
};
const SCOPE_LABEL: Record<TaskScope, string> = { active: 'Active', done: 'Done', archive: 'Archived' };
const EFFORT_ORDER = new Map([['XS', 0], ['SMALL', 1], ['S', 1], ['LOW', 1], ['QUICK', 1], ['MEDIUM', 2], ['M', 2], ['DEEP_WORK', 3], ['LARGE', 3], ['L', 3], ['HIGH', 3], ['XL', 4]]);

const mutationSuccessMessage = (method: string, url: string) => {
  if (method === 'POST' && url.includes('/dependencies')) return 'Dependency added.';
  if (method === 'DELETE' && url.includes('/dependencies/')) return 'Dependency removed.';
  if (method === 'POST') return 'Task created successfully.';
  if (method === 'PUT') return 'Task updated successfully.';
  if (method === 'DELETE') return 'Task deleted successfully.';
  if (url.includes('/complete')) return 'Task completed successfully.';
  if (url.includes('/status')) return 'Task status updated successfully.';
  if (url.includes('/move')) return 'Task moved successfully.';
  return 'Task action completed successfully.';
};

const mutationAnnouncement = (result: ApiCallResult<unknown>) => {
  if (result.ok) return mutationSuccessMessage(result.request.method, result.request.url);
  return result.error?.message ?? 'Task action failed.';
};

const filterValueFromParams = (searchParams: URLSearchParams, key: 'status' | 'area' | 'effort' | 'project'): FilterValue => searchParams.get(key) || 'all';
const dateValueFromParams = (searchParams: URLSearchParams, key: 'dueFrom' | 'dueTo') => searchParams.get(key) || '';
const sortValueFromParams = (searchParams: URLSearchParams): TaskSortValue => {
  const sort = searchParams.get('sort') as TaskSortValue | null;
  return sort && SORT_VALUES.includes(sort) ? sort : DEFAULT_SORT;
};
const lensFromParams = (searchParams: URLSearchParams): TaskLens => {
  const value = searchParams.get('readiness');
  return value && isTaskLens(value) ? value : 'all';
};
const signalsFromParams = (searchParams: URLSearchParams): TaskSignal[] =>
  TASK_SIGNAL_VALUES.filter((signal) => searchParams.get(signal) === 'true');

const updateParam = (params: URLSearchParams, key: string, value: string | boolean, defaultValue: string | boolean) => {
  if (value === defaultValue || value === '') params.delete(key);
  else params.set(key, String(value));
};

const taskDateValue = (value?: string) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

const taskCreatedDateValue = (task: TaskRecord) => {
  const time = taskDateValue(task.createdDate);
  return Number.isFinite(time) ? time : 0;
};

const effortRank = (task: TaskRecord) => {
  const effort = task.effort?.toUpperCase();
  if (!effort) return Number.POSITIVE_INFINITY;
  return EFFORT_ORDER.get(effort) ?? Number.POSITIVE_INFINITY;
};

const sortTasks = (tasks: TaskRecord[], sort: TaskSortValue) => [...tasks].sort((a, b) => {
  if (sort === 'priorityScore') return (b.priorityScore ?? Number.NEGATIVE_INFINITY) - (a.priorityScore ?? Number.NEGATIVE_INFINITY) || a.id - b.id;
  if (sort === 'dueDate') return taskDateValue(a.dueDate) - taskDateValue(b.dueDate) || a.id - b.id;
  if (sort === 'createdDate') return taskCreatedDateValue(b) - taskCreatedDateValue(a) || a.id - b.id;
  if (sort === 'effort') return effortRank(a) - effortRank(b) || a.title.localeCompare(b.title) || a.id - b.id;
  if (sort === 'title') return a.title.localeCompare(b.title) || a.id - b.id;
  return (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || a.id - b.id;
});

const isOnOrAfterDate = (taskDate: string | undefined, filterDate: string) => Boolean(taskDate) && taskDate!.slice(0, 10) >= filterDate;
const isOnOrBeforeDate = (taskDate: string | undefined, filterDate: string) => Boolean(taskDate) && taskDate!.slice(0, 10) <= filterDate;

const matchesProject = (task: TaskRecord, projectFilter: FilterValue) => {
  if (projectFilter === 'all') return true;
  if (projectFilter === 'none') return task.projectId === undefined || task.projectId === null;
  return String(task.projectId ?? '') === projectFilter;
};

/**
 * The Tasks workspace (issue #304). Information architecture, responsive model and interaction
 * rules come from the UI UX Pro Max research recorded in
 * `design-system/tracker-be/pages/tasks-workspace.md` and
 * `design-system/tracker-be/research/tool-transcripts/05-tasks-workspace.md`.
 *
 * Readiness is backend-authoritative and interpreted in exactly one place
 * (`components/tasks/taskLenses.ts`); this page never derives `ready` from `!blocked`.
 */
export function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [scope, setScope] = useState<TaskScope>('active');
  const [createOpen, setCreateOpen] = useState(false);
  const [createProjectId, setCreateProjectId] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dependenciesOpen, setDependenciesOpen] = useState(false);
  const [dependencyTaskId, setDependencyTaskId] = useState('');
  const [dependencyBlocksTaskId, setDependencyBlocksTaskId] = useState('');
  const { announce } = useAnnouncement();
  const search = searchParams.get('q') || '';
  const statusFilter = filterValueFromParams(searchParams, 'status');
  const projectFilter = filterValueFromParams(searchParams, 'project');
  const areaFilter = filterValueFromParams(searchParams, 'area');
  const effortFilter = filterValueFromParams(searchParams, 'effort');
  const dueFrom = dateValueFromParams(searchParams, 'dueFrom');
  const dueTo = dateValueFromParams(searchParams, 'dueTo');
  const lens = lensFromParams(searchParams);
  const signals = useMemo(() => signalsFromParams(searchParams), [searchParams]);
  const sort = sortValueFromParams(searchParams);
  const createFormRef = useRef<TaskCreateFormHandle>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const { showUndo } = useUndoToast();

  const setFilterParam = useCallback((key: (typeof FILTER_PARAM_KEYS)[number], value: string | boolean, defaultValue: string | boolean) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      updateParam(next, key, value, defaultValue);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      FILTER_PARAM_KEYS.forEach((key) => next.delete(key));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const applySavedView = useCallback((params: string) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      FILTER_PARAM_KEYS.forEach((key) => next.delete(key));
      const savedParams = new URLSearchParams(params);
      FILTER_PARAM_KEYS.forEach((key) => {
        const value = savedParams.get(key);
        if (value) next.set(key, value);
      });
      return next;
    });
  }, [setSearchParams]);

  const toggleSignal = useCallback((signal: TaskSignal) => {
    setFilterParam(signal, searchParams.get(signal) !== 'true', false);
  }, [searchParams, setFilterParam]);

  const activeQuery = useTasksQuery('active');
  const archiveQuery = useTasksQuery('archive');
  const query = scope === 'archive' ? archiveQuery : activeQuery;
  const { createTask, updateTask, deleteTask, completeTask, changeStatus, addDependency, removeDependency, updateTaskProject } = useTaskMutations();
  const { startSession } = useFocusSessionMutations();
  const projectsQuery = useProjectsQuery();
  const projects = useMemo<ProjectRecord[]>(() => (Array.isArray(projectsQuery.data?.data) ? (projectsQuery.data.data as ProjectRecord[]) : []), [projectsQuery.data]);
  const projectNames = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);
  const busy = createTask.isPending || updateTask.isPending || deleteTask.isPending || completeTask.isPending || changeStatus.isPending || addDependency.isPending || removeDependency.isPending || updateTaskProject.isPending;

  const activeData = activeQuery.data?.data;
  const archiveData = archiveQuery.data?.data;
  const activeTasks = useMemo<TaskRecord[]>(() => (Array.isArray(activeData) ? (activeData as TaskRecord[]) : []), [activeData]);
  const archiveTasks = useMemo<TaskRecord[]>(() => (Array.isArray(archiveData) ? (archiveData as TaskRecord[]) : []), [archiveData]);
  const doneTasks = useMemo(() => activeTasks.filter((task) => task.status === 'DONE' || Boolean(task.completedDate)), [activeTasks]);
  const activeWorkTasks = useMemo(() => activeTasks.filter((task) => task.status !== 'DONE' && !task.completedDate), [activeTasks]);
  const tasks = scope === 'archive' ? archiveTasks : scope === 'done' ? doneTasks : activeWorkTasks;
  const areaOptions = useMemo(() => uniqueOptions(tasks, 'area'), [tasks]);
  const effortOptions = useMemo(() => uniqueOptions(tasks, 'effort'), [tasks]);

  // Rail counts are taken over the WHOLE current scope, before search and filters, so they never
  // report a number derived from a partial dataset (issue #304 §4).
  const lensCounts = useMemo(() => countTaskLenses(tasks), [tasks]);
  const signalCounts = useMemo(() => countTaskSignals(tasks), [tasks]);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    if (!matchesLens(task, lens)) return false;
    if (!signals.every((signal) => matchesSignal(task, signal))) return false;
    if (!taskMatchesSearch(task, search)) return false;
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (!matchesProject(task, projectFilter)) return false;
    if (areaFilter !== 'all' && task.area !== areaFilter) return false;
    if (effortFilter !== 'all' && task.effort !== effortFilter) return false;
    if (dueFrom && !isOnOrAfterDate(task.dueDate, dueFrom)) return false;
    if (dueTo && !isOnOrBeforeDate(task.dueDate, dueTo)) return false;
    return true;
  }), [areaFilter, dueFrom, dueTo, effortFilter, lens, projectFilter, search, signals, statusFilter, tasks]);

  const sortedFilteredTasks = useMemo(() => sortTasks(filteredTasks, sort), [filteredTasks, sort]);
  const taskTree = useMemo(() => buildTaskTree(sortedFilteredTasks, (nodes) => nodes), [sortedFilteredTasks]);

  const popoverFilterCount = POPOVER_FILTER_KEYS.filter((key) => {
    const value = searchParams.get(key);
    return Boolean(value) && value !== 'all';
  }).length;
  const queryFilterCount = popoverFilterCount + (search.trim() ? 1 : 0);
  const activeFilterCount = queryFilterCount + (sort !== DEFAULT_SORT ? 1 : 0);

  const serializedFilters = useMemo(() => {
    const params = new URLSearchParams();
    FILTER_PARAM_KEYS.forEach((key) => {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [searchParams]);

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (search.trim()) chips.push({ key: 'q', label: `Search: “${search.trim()}”`, onRemove: () => setFilterParam('q', '', '') });
    if (statusFilter !== 'all') chips.push({ key: 'status', label: `Status: ${formatEnumLabel(statusFilter)}`, onRemove: () => setFilterParam('status', 'all', 'all') });
    if (projectFilter !== 'all') {
      const label = projectFilter === 'none' ? 'No project' : projectNames.get(Number(projectFilter)) ?? `#${projectFilter}`;
      chips.push({ key: 'project', label: `Project: ${label}`, onRemove: () => setFilterParam('project', 'all', 'all') });
    }
    if (areaFilter !== 'all') chips.push({ key: 'area', label: `Area: ${formatEnumLabel(areaFilter)}`, onRemove: () => setFilterParam('area', 'all', 'all') });
    if (effortFilter !== 'all') chips.push({ key: 'effort', label: `Effort: ${formatEnumLabel(effortFilter)}`, onRemove: () => setFilterParam('effort', 'all', 'all') });
    if (dueFrom) chips.push({ key: 'dueFrom', label: `Due from ${dueFrom}`, onRemove: () => setFilterParam('dueFrom', '', '') });
    if (dueTo) chips.push({ key: 'dueTo', label: `Due to ${dueTo}`, onRemove: () => setFilterParam('dueTo', '', '') });
    if (sort !== DEFAULT_SORT) chips.push({ key: 'sort', label: `Sorted by ${SORT_LABEL[sort]}`, onRemove: () => setFilterParam('sort', DEFAULT_SORT, DEFAULT_SORT) });
    return chips;
  }, [areaFilter, dueFrom, dueTo, effortFilter, projectFilter, projectNames, search, setFilterParam, sort, statusFilter]);

  const taskQueryError = query.isError || isQueryError(query.data);
  const taskQueryLoading = query.isLoading && !taskQueryError;
  const scopeLabel = SCOPE_LABEL[scope];
  const taskListLabel = `${scopeLabel} task list`;

  const resultSummary = useMemo(() => {
    const parts = [`${sortedFilteredTasks.length} of ${tasks.length} ${scopeLabel.toLowerCase()} task${tasks.length === 1 ? '' : 's'} shown`];
    if (lens !== 'all') parts.push(`work state: ${TASK_LENS_LABEL[lens]}`);
    if (signals.length > 0) parts.push(`signals: ${signals.map((signal) => TASK_SIGNAL_LABEL[signal]).join(', ')}`);
    if (activeFilterCount > 0) parts.push(`${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} or sort applied`);
    return `${parts.join('. ')}.`;
  }, [activeFilterCount, lens, scopeLabel, signals, sortedFilteredTasks.length, tasks.length]);

  const latestMutationResult = latestResult(removeDependency.data, addDependency.data, changeStatus.data, completeTask.data, deleteTask.data, updateTask.data, createTask.data);
  useEffect(() => {
    if (!latestMutationResult) return;
    announce(mutationAnnouncement(latestMutationResult));
  }, [announce, latestMutationResult]);

  const showCreatePanel = useCallback(() => {
    setCreateOpen(true);
    window.requestAnimationFrame(() => createFormRef.current?.focusTitle());
  }, []);

  useEffect(() => {
    if (searchParams.get('quickAdd') !== '1') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opening the drawer here is a one-time reaction to an incoming ?quickAdd=1 link, not state sync.
    showCreatePanel();
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete('quickAdd');
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when the quickAdd param is present, not on every filter change.
  }, [searchParams]);

  const closeCreatePanel = () => {
    setCreateOpen(false);
    setCreateProjectId('');
    window.requestAnimationFrame(() => createButtonRef.current?.focus());
  };

  const startSubtask = useCallback((task: TaskRecord) => {
    setCreateOpen(true);
    window.requestAnimationFrame(() => {
      createFormRef.current?.setParentTaskId(String(task.id));
      createFormRef.current?.focusTitle();
    });
  }, []);

  const submitCreate = (payload: CreateTaskPayload, onSuccess: () => void) => {
    createTask.mutate(payload, {
      onSuccess: (result) => {
        if (!result.ok) return;
        const createdId = (result.data as TaskRecord | null)?.id;
        if (createdId && createProjectId) updateTaskProject.mutate({ id: createdId, projectId: Number(createProjectId) });
        setCreateProjectId('');
        onSuccess();
      },
    });
  };

  const snoozeFollowUp = useCallback((task: TaskRecord) => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    updateTask.mutate({ id: task.id, body: buildTaskUpdateBody(task, { followUpDate: next.toISOString().slice(0, 10) }) });
  }, [updateTask]);

  const handleComplete = useCallback((taskId: number) => {
    const task = activeTasks.find((candidate) => candidate.id === taskId);
    const previousStatus = task?.status;
    completeTask.mutate(taskId, {
      onSuccess: (result) => {
        if (!result.ok || !previousStatus) return;
        showUndo(`"${task?.title ?? 'Task'}" marked complete.`, () => changeStatus.mutate({ id: taskId, status: previousStatus }));
      },
    });
  }, [activeTasks, changeStatus, completeTask, showUndo]);

  const handleChangeStatus = useCallback((taskId: number, status: string) => {
    const task = activeTasks.find((candidate) => candidate.id === taskId);
    const previousStatus = task?.status;
    changeStatus.mutate({ id: taskId, status }, {
      onSuccess: (result) => {
        if (!result.ok || !previousStatus) return;
        showUndo(`"${task?.title ?? 'Task'}" moved to ${formatEnumLabel(status)}.`, () => changeStatus.mutate({ id: taskId, status: previousStatus }));
      },
    });
  }, [activeTasks, changeStatus, showUndo]);

  const openDependencyManager = useCallback((task: TaskRecord) => {
    setDependencyTaskId(String(task.id));
    setDependencyBlocksTaskId('');
    setDependenciesOpen(true);
  }, []);

  const handleDelete = useCallback((taskId: number) => deleteTask.mutate(taskId), [deleteTask]);

  const handleStartFocusSession = useCallback((task: TaskRecord) => startSession.mutate(task.id, {
    onSuccess: (result) => announce(result.ok ? `Focus session started for "${task.title}".` : (result.error?.message ?? 'Could not start focus session.')),
  }), [announce, startSession]);

  const submitDependency = () => {
    const id = Number(dependencyTaskId);
    const blocksTaskId = Number(dependencyBlocksTaskId);
    if (!Number.isFinite(id) || !Number.isFinite(blocksTaskId) || id === blocksTaskId) return;
    addDependency.mutate({ id, blocksTaskId }, { onSuccess: (result) => { if (result.ok) setDependenciesOpen(false); } });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-6 sm:px-6" aria-busy={busy || query.isFetching}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-fg">Tasks</h2>
          <p className="mt-1 text-sm text-fg-muted">What you can act on, what is blocked, and what needs attention.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SectionTabs items={TASK_VIEW_TABS} ariaLabel="Task view" />
          <Button ref={createButtonRef} variant="primary" onClick={showCreatePanel} disabled={busy}>
            <Plus className="h-4 w-4" aria-hidden />
            Add task
          </Button>
        </div>
      </header>

      <TaskWorkspaceRail
        scopeLabel={scopeLabel.toLowerCase()}
        lens={lens}
        onLensChange={(next) => setFilterParam('readiness', next, 'all')}
        lensCounts={lensCounts}
        signals={signals}
        onToggleSignal={toggleSignal}
        signalCounts={signalCounts}
      />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1 sm:max-w-xs" htmlFor="plannerTaskSearch">
            <span className="sr-only">Search tasks</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input id="plannerTaskSearch" type="search" className="pl-9" placeholder="Search tasks" value={search} onChange={(e) => setFilterParam('q', e.target.value, '')} />
          </label>
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button aria-expanded={filtersOpen}>
                <Filter className="h-4 w-4" aria-hidden />
                Filters
                {popoverFilterCount > 0 && <Badge variant="brand" aria-label={`${popoverFilterCount} active filters`}>{popoverFilterCount}</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(38rem,calc(100vw-2rem))]" aria-label="Refine task list">
              <TaskFilters
                statusFilter={statusFilter}
                projectFilter={projectFilter}
                areaFilter={areaFilter}
                effortFilter={effortFilter}
                dueFrom={dueFrom}
                dueTo={dueTo}
                activeFilterCount={activeFilterCount}
                areaOptions={areaOptions}
                effortOptions={effortOptions}
                projects={projects}
                disabled={false}
                onStatusFilterChange={(value) => setFilterParam('status', value, 'all')}
                onProjectFilterChange={(value) => setFilterParam('project', value, 'all')}
                onAreaFilterChange={(value) => setFilterParam('area', value, 'all')}
                onEffortFilterChange={(value) => setFilterParam('effort', value, 'all')}
                onDueFromChange={(value) => setFilterParam('dueFrom', value, '')}
                onDueToChange={(value) => setFilterParam('dueTo', value, '')}
                onClearAll={clearFilters}
              />
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2">
            <label htmlFor="taskSortControl" className="whitespace-nowrap text-[13px] font-medium text-fg-muted">Sort by</label>
            <div className="w-40">
              <Select
                id="taskSortControl"
                value={sort}
                onChange={(event) => setFilterParam('sort', event.target.value as TaskSortValue, DEFAULT_SORT)}
              >
                {SORT_VALUES.map((value) => <option key={value} value={value}>{SORT_LABEL[value]}</option>)}
              </Select>
            </div>
          </div>
          <TaskSavedViews serializedFilters={serializedFilters} onApply={applySavedView} />
          <div className="ms-auto">
            <SegmentedControl
              aria-label="Task status views"
              value={scope}
              onValueChange={setScope}
              options={[
                { value: 'active', label: <>Active <span className="text-fg-subtle tabular-nums">{activeWorkTasks.length}</span></> },
                { value: 'done', label: <>Done <span className="text-fg-subtle tabular-nums">{doneTasks.length}</span></> },
                { value: 'archive', label: <>Archived <span className="text-fg-subtle tabular-nums">{archiveTasks.length}</span></> },
              ]}
            />
          </div>
        </div>

        <TaskActiveFilters chips={activeFilterChips} onClearAll={clearFilters} />
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="task-list-heading">
        <h3 id="task-list-heading" className="sr-only">{taskListLabel}</h3>
        {/* Exactly one live region for the whole workspace, carrying a contextual sentence rather
            than a bare number (skill `ux` "Contextual Live Badge Updates", High). */}
        <p role="status" aria-atomic="true" className="text-sm text-fg-muted">{resultSummary}</p>

        {taskQueryError ? (
          <TaskListError onRetry={() => { void query.refetch(); }} isRetrying={query.isFetching} />
        ) : taskQueryLoading ? (
          <TaskListSkeleton />
        ) : sortedFilteredTasks.length === 0 ? (
          <TaskListEmpty
            scope={scope}
            lens={lens}
            signals={signals}
            hasQueryFilters={queryFilterCount > 0}
            lensCounts={lensCounts}
            onAddTask={showCreatePanel}
            onClearFilters={clearFilters}
            onShowBlocked={() => setFilterParam('readiness', 'blocked', 'all')}
            onShowAll={clearFilters}
            disabled={busy}
          />
        ) : (
          <TaskListView
            tasks={taskTree}
            projectNames={projectNames}
            label={taskListLabel}
            busy={busy}
            onComplete={handleComplete}
            onStartSubtask={startSubtask}
            onChangeStatus={handleChangeStatus}
            onSnoozeFollowUp={snoozeFollowUp}
            onManageDependencies={openDependencyManager}
            onDelete={handleDelete}
            onStartFocusSession={handleStartFocusSession}
          />
        )}
      </section>

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

      <Drawer
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) closeCreatePanel();
        }}
        title="Create task"
        description="Quick capture for new work."
        wide
      >
        <TaskCreateForm
          ref={createFormRef}
          activeTasks={activeTasks}
          projects={projects}
          projectId={createProjectId}
          onProjectIdChange={setCreateProjectId}
          busy={busy}
          isSubmitting={createTask.isPending}
          onCancel={closeCreatePanel}
          onSubmit={submitCreate}
          onInvalidTitle={() => setCreateOpen(true)}
        />
      </Drawer>
    </div>
  );
}
