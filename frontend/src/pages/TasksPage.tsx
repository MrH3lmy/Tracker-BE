import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ApiCallResult } from '../apiClient';
import { useAnnouncement } from '../announcementContext';
import { QueryState } from '../components/QueryState';
import { TaskCreateForm, type TaskCreateFormHandle } from '../components/tasks/TaskCreateForm';
import { ManageDependenciesDrawer } from '../components/tasks/ManageDependenciesDrawer';
import { TaskEmptyState } from '../components/tasks/TaskEmptyState';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { TaskListView } from '../components/tasks/TaskListView';
import type { CreateTaskPayload, FilterValue, TaskRecord, TaskSortValue } from '../components/tasks/taskTypes';
import { buildTaskTree, isOverdue, taskMatchesSearch, uniqueOptions } from '../components/tasks/taskUtils';
import { latestResult, useTaskMutations, useTasksQuery } from '../hooks/useApiQueries';

const DEFAULT_SORT: TaskSortValue = 'position';
const FILTER_PARAM_KEYS = ['q', 'status', 'area', 'effort', 'dueFrom', 'dueTo', 'overdue', 'sort'] as const;
const SORT_VALUES: TaskSortValue[] = ['position', 'priorityScore', 'dueDate', 'createdDate', 'effort', 'title'];
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

const filterValueFromParams = (searchParams: URLSearchParams, key: 'status' | 'area' | 'effort'): FilterValue => searchParams.get(key) || 'all';
const dateValueFromParams = (searchParams: URLSearchParams, key: 'dueFrom' | 'dueTo') => searchParams.get(key) || '';
const overdueValueFromParams = (searchParams: URLSearchParams) => searchParams.get('overdue') === 'true';
const sortValueFromParams = (searchParams: URLSearchParams): TaskSortValue => {
  const sort = searchParams.get('sort') as TaskSortValue | null;
  return sort && SORT_VALUES.includes(sort) ? sort : DEFAULT_SORT;
};

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

const nullableValue = <T,>(value: T | undefined | null) => value ?? null;

const buildTaskUpdateBody = (task: TaskRecord, updates: Partial<TaskRecord>) => {
  const next = { ...task, ...updates };
  return {
    title: next.title,
    description: nullableValue(next.description),
    dueDate: nullableValue(next.dueDate?.slice(0, 10)),
    startDate: nullableValue(next.startDate?.slice(0, 10)),
    estimatedMinutes: nullableValue(next.estimatedMinutes),
    actualMinutes: nullableValue(next.actualMinutes),
    riskLevel: nullableValue(next.riskLevel),
    riskReason: nullableValue(next.riskReason),
    track: nullableValue(next.track),
    phase: nullableValue(next.phase),
    parentTaskId: nullableValue(next.parentTaskId),
    important: Boolean(next.important),
    status: nullableValue(next.status),
    area: nullableValue(next.area),
    effort: nullableValue(next.effort),
    blockedReason: nullableValue(next.blockedReason),
    waitingOn: nullableValue(next.waitingOn),
    followUpDate: nullableValue(next.followUpDate?.slice(0, 10)),
    boardColumnId: nullableValue(next.boardColumnId),
    position: nullableValue(next.position),
    dependencyIds: next.dependencyIds ?? [],
  };
};

export function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<'active' | 'done' | 'archive'>('active');
  const [createOpen, setCreateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dependenciesOpen, setDependenciesOpen] = useState(false);
  const [dependencyTaskId, setDependencyTaskId] = useState('');
  const [dependencyBlocksTaskId, setDependencyBlocksTaskId] = useState('');
  const { announce } = useAnnouncement();
  const search = searchParams.get('q') || '';
  const statusFilter = filterValueFromParams(searchParams, 'status');
  const areaFilter = filterValueFromParams(searchParams, 'area');
  const effortFilter = filterValueFromParams(searchParams, 'effort');
  const dueFrom = dateValueFromParams(searchParams, 'dueFrom');
  const dueTo = dateValueFromParams(searchParams, 'dueTo');
  const overdueOnly = overdueValueFromParams(searchParams);
  const sort = sortValueFromParams(searchParams);
  const createFormRef = useRef<TaskCreateFormHandle>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);

  const setFilterParam = (key: (typeof FILTER_PARAM_KEYS)[number], value: string | boolean, defaultValue: string | boolean) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      updateParam(next, key, value, defaultValue);
      return next;
    }, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      FILTER_PARAM_KEYS.forEach((key) => next.delete(key));
      return next;
    }, { replace: true });
  };

  const applySavedView = (params: string) => {
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
  };

  const activeQuery = useTasksQuery('active');
  const archiveQuery = useTasksQuery('archive');
  const query = tab === 'archive' ? archiveQuery : activeQuery;
  const { createTask, updateTask, deleteTask, completeTask, changeStatus, addDependency, removeDependency } = useTaskMutations();
  const busy = createTask.isPending || updateTask.isPending || deleteTask.isPending || completeTask.isPending || changeStatus.isPending || addDependency.isPending || removeDependency.isPending;

  const activeData = activeQuery.data?.data;
  const archiveData = archiveQuery.data?.data;
  const activeTasks = useMemo<TaskRecord[]>(() => (Array.isArray(activeData) ? (activeData as TaskRecord[]) : []), [activeData]);
  const archiveTasks = useMemo<TaskRecord[]>(() => (Array.isArray(archiveData) ? (archiveData as TaskRecord[]) : []), [archiveData]);
  const doneTasks = useMemo(() => activeTasks.filter((task) => task.status === 'DONE' || Boolean(task.completedDate)), [activeTasks]);
  const activeWorkTasks = useMemo(() => activeTasks.filter((task) => task.status !== 'DONE' && !task.completedDate), [activeTasks]);
  const tasks = tab === 'archive' ? archiveTasks : tab === 'done' ? doneTasks : activeWorkTasks;
  const areaOptions = useMemo(() => uniqueOptions(tasks, 'area'), [tasks]);
  const effortOptions = useMemo(() => uniqueOptions(tasks, 'effort'), [tasks]);
  const filteredTasks = useMemo(() => tasks.filter((task) => {
    if (!taskMatchesSearch(task, search)) return false;
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (areaFilter !== 'all' && task.area !== areaFilter) return false;
    if (effortFilter !== 'all' && task.effort !== effortFilter) return false;
    if (dueFrom && !isOnOrAfterDate(task.dueDate, dueFrom)) return false;
    if (dueTo && !isOnOrBeforeDate(task.dueDate, dueTo)) return false;
    if (overdueOnly && !isOverdue(task)) return false;
    return true;
  }), [areaFilter, dueFrom, dueTo, effortFilter, overdueOnly, search, statusFilter, tasks]);
  const sortedFilteredTasks = useMemo(() => sortTasks(filteredTasks, sort), [filteredTasks, sort]);
  const taskFilterCount = [search.trim(), statusFilter !== 'all', areaFilter !== 'all', effortFilter !== 'all', dueFrom, dueTo, overdueOnly].filter(Boolean).length;
  const activeFilterCount = taskFilterCount + (sort !== DEFAULT_SORT ? 1 : 0);
  const serializedFilters = useMemo(() => {
    const params = new URLSearchParams();
    updateParam(params, 'q', search.trim(), '');
    updateParam(params, 'status', statusFilter, 'all');
    updateParam(params, 'area', areaFilter, 'all');
    updateParam(params, 'effort', effortFilter, 'all');
    updateParam(params, 'dueFrom', dueFrom, '');
    updateParam(params, 'dueTo', dueTo, '');
    updateParam(params, 'overdue', overdueOnly, false);
    updateParam(params, 'sort', sort, DEFAULT_SORT);
    return params.toString();
  }, [areaFilter, dueFrom, dueTo, effortFilter, overdueOnly, search, sort, statusFilter]);
  const taskTree = useMemo(() => buildTaskTree(sortedFilteredTasks, (nodes) => nodes), [sortedFilteredTasks]);
  const taskQueryLoading = query.isLoading || query.isFetching;
  const taskQueryError = Boolean(query.data && !query.data.ok);
  const showActiveEmptyState = tab === 'active' && !taskQueryLoading && !taskQueryError && sortedFilteredTasks.length === 0 && taskFilterCount === 0;
  const latestMutationResult = latestResult(removeDependency.data, addDependency.data, changeStatus.data, completeTask.data, deleteTask.data, updateTask.data, createTask.data);
  const taskListLabel = `${tab === 'archive' ? 'Archived' : tab === 'done' ? 'Done' : 'Active'} task list`;
  useEffect(() => {
    if (!latestMutationResult) return;
    announce(mutationAnnouncement(latestMutationResult));
  }, [announce, latestMutationResult]);

  const showCreatePanel = () => {
    setCreateOpen(true);
    window.requestAnimationFrame(() => createFormRef.current?.focusTitle());
  };

  const closeCreatePanel = () => {
    setCreateOpen(false);
    window.requestAnimationFrame(() => createButtonRef.current?.focus());
  };

  const startSubtask = (task: TaskRecord) => {
    setCreateOpen(true);
    window.requestAnimationFrame(() => {
      createFormRef.current?.setParentTaskId(String(task.id));
      createFormRef.current?.focusTitle();
    });
  };

  const submitCreate = (payload: CreateTaskPayload, onSuccess: () => void) => {
    createTask.mutate(payload, { onSuccess });
  };

  const updateTaskFromCard = (task: TaskRecord, updates: Partial<TaskRecord>) => {
    updateTask.mutate({ id: task.id, body: buildTaskUpdateBody(task, updates) });
  };

  const snoozeFollowUp = (task: TaskRecord) => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    updateTaskFromCard(task, { followUpDate: next.toISOString().slice(0, 10) });
  };

  const openDependencyManager = (task: TaskRecord) => {
    setDependencyTaskId(String(task.id));
    setDependencyBlocksTaskId('');
    setDependenciesOpen(true);
  };

  const submitDependency = () => {
    const id = Number(dependencyTaskId);
    const blocksTaskId = Number(dependencyBlocksTaskId);
    if (!Number.isFinite(id) || !Number.isFinite(blocksTaskId) || id === blocksTaskId) return;
    addDependency.mutate({ id, blocksTaskId }, { onSuccess: () => setDependenciesOpen(false) });
  };

  return (
    <div className="tasks-page tasks-page-simple" aria-busy={busy}>
      <header className="tasks-planner-shell" aria-label="Task controls">
        <div className="tasks-planner-topbar">
          <div className="tasks-planner-title">
            <h2>Tasks</h2>
            <p>Manage, prioritize, and complete your work.</p>
          </div>

          <div className="planner-toolbar" aria-label="Task actions">
            <label className="planner-search" htmlFor="plannerTaskSearch">
              <span className="sr-only">Search tasks</span>
              <input id="plannerTaskSearch" placeholder="Search tasks" value={search} onChange={(e) => setFilterParam('q', e.target.value, '')} />
            </label>
            <button className="planner-icon-button planner-filter-button" type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} aria-controls="task-filter-panel">
              <span>Filters</span>
              {activeFilterCount > 0 && <span className="planner-filter-badge" aria-label={`${activeFilterCount} active filters`}>{activeFilterCount}</span>}
            </button>
            <button ref={createButtonRef} className="button-primary planner-new-task" type="button" onClick={showCreatePanel} disabled={busy}>
              Add task
            </button>
          </div>
        </div>

        <div className="task-view-toggle task-view-tabs-row" role="group" aria-label="Task status views">
          <button className={tab === 'active' ? 'active' : ''} type="button" onClick={() => setTab('active')}>Active <span>{activeWorkTasks.length}</span></button>
          <button className={tab === 'done' ? 'active' : ''} type="button" onClick={() => setTab('done')}>Done <span>{doneTasks.length}</span></button>
          <button className={tab === 'archive' ? 'active' : ''} type="button" onClick={() => setTab('archive')}>Archived <span>{archiveTasks.length}</span></button>
        </div>
      </header>

      {filtersOpen && (
        <aside id="task-filter-panel" className="task-filter-popover" role="region" aria-labelledby="task-filter-panel-title">
          <div className="task-filter-popover-header">
            <div>
              <p className="eyebrow">Advanced filters</p>
              <h3 id="task-filter-panel-title">Refine task list</h3>
            </div>
            <button className="planner-icon-button" type="button" onClick={() => setFiltersOpen(false)}>Close</button>
          </div>
          <TaskFilters
            search={search}
            statusFilter={statusFilter}
            areaFilter={areaFilter}
            effortFilter={effortFilter}
            dueFrom={dueFrom}
            dueTo={dueTo}
            overdueOnly={overdueOnly}
            sort={sort}
            activeFilterCount={activeFilterCount}
            areaOptions={areaOptions}
            effortOptions={effortOptions}
            disabled={false}
            serializedFilters={serializedFilters}
            showSearch={false}
            onSearchChange={(value) => setFilterParam('q', value, '')}
            onStatusFilterChange={(value) => setFilterParam('status', value, 'all')}
            onAreaFilterChange={(value) => setFilterParam('area', value, 'all')}
            onEffortFilterChange={(value) => setFilterParam('effort', value, 'all')}
            onDueFromChange={(value) => setFilterParam('dueFrom', value, '')}
            onDueToChange={(value) => setFilterParam('dueTo', value, '')}
            onOverdueOnlyChange={(value) => setFilterParam('overdue', value, false)}
            onSortChange={(value) => setFilterParam('sort', value, DEFAULT_SORT)}
            onClearAll={clearFilters}
            onApplySavedView={applySavedView}
          />
        </aside>
      )}

      <section className="panel task-workspace" aria-labelledby="task-list-heading">
        <h3 id="task-list-heading" className="sr-only">{taskListLabel}</h3>
        <p className="task-filter-summary">{activeFilterCount > 0 ? `${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} / sort applied.` : 'Use filters to quickly find the next task to move.'}</p>

        <QueryState
          isLoading={taskQueryLoading}
          isError={taskQueryError}
          isEmpty={!taskQueryLoading && sortedFilteredTasks.length === 0 && !showActiveEmptyState}
          emptyMessage={taskFilterCount > 0 ? 'No tasks match your filters.' : 'No tasks available.'}
          successMessage={createTask.data?.ok ? 'Task created successfully.' : undefined}
        />

        {showActiveEmptyState && <TaskEmptyState onAddTask={showCreatePanel} disabled={busy} />}

        {sortedFilteredTasks.length > 0 && (
          <TaskListView
            tasks={taskTree}
            busy={busy}
            onComplete={(taskId) => completeTask.mutate(taskId)}
            onStartSubtask={(task) => startSubtask(task)}
            onChangeStatus={(id, status) => changeStatus.mutate({ id, status })}
            onSnoozeFollowUp={snoozeFollowUp}
            onRemoveDependency={(id, blocksTaskId) => removeDependency.mutate({ id, blocksTaskId })}
            onManageDependencies={openDependencyManager}
            onDelete={(taskId) => deleteTask.mutate(taskId)}
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

      {createOpen && (
        <div className="task-create-drawer-backdrop" role="presentation">
          <aside className="task-create-drawer" role="dialog" aria-modal="true" aria-labelledby="create-task-title">
            <TaskCreateForm
              ref={createFormRef}
              activeTasks={activeTasks}
              busy={busy}
              isCreating={createTask.isPending}
              onCancel={closeCreatePanel}
              onCreate={submitCreate}
              onInvalidTitle={() => setCreateOpen(true)}
            />
          </aside>
        </div>
      )}

    </div>
  );
}
