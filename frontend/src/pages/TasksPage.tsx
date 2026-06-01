import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ApiCallResult } from '../apiClient';
import { useAnnouncement } from '../announcementContext';
import { QueryState } from '../components/QueryState';
import { RequestInspector } from '../components/RequestInspector';
import { BlockerPanel } from '../components/tasks/BlockerPanel';
import { TaskBoard } from '../components/tasks/TaskBoard';
import { TaskCreateForm, type TaskCreateFormHandle } from '../components/tasks/TaskCreateForm';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { TaskListView } from '../components/tasks/TaskListView';
import type { BlockerAnalysis, CreateTaskPayload, DuplicateGroup, FilterValue, TaskRecord, TaskSortValue, TaskTreeNode, ViewMode } from '../components/tasks/taskTypes';
import { buildTaskTree, isOverdue, taskMatchesSearch, uniqueOptions } from '../components/tasks/taskUtils';
import { latestResult, useTaskBlockersQuery, useTaskMutations, useTasksQuery, type TaskTab } from '../hooks/useApiQueries';
import { useBoardState } from '../hooks/useBoardState';
import { TASK_STATUS_VALUES, type TaskStatus } from '../validation/taskStatus';

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
  const [tab, setTab] = useState<TaskTab>('active');
  const [createOpen, setCreateOpen] = useState(false);
  const { announce } = useAnnouncement();
  const search = searchParams.get('q') || '';
  const statusFilter = filterValueFromParams(searchParams, 'status');
  const areaFilter = filterValueFromParams(searchParams, 'area');
  const effortFilter = filterValueFromParams(searchParams, 'effort');
  const dueFrom = dateValueFromParams(searchParams, 'dueFrom');
  const dueTo = dateValueFromParams(searchParams, 'dueTo');
  const overdueOnly = overdueValueFromParams(searchParams);
  const sort = sortValueFromParams(searchParams);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [dependencyTaskId, setDependencyTaskId] = useState('');
  const [dependencyBlocksTaskId, setDependencyBlocksTaskId] = useState('');
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
  const duplicatesQuery = useTasksQuery('duplicates');
  const blockersQuery = useTaskBlockersQuery();
  const query = tab === 'active' ? activeQuery : tab === 'archive' ? archiveQuery : duplicatesQuery;
  const { createTask, updateTask, deleteTask, completeTask, changeStatus, moveTask, addDependency, removeDependency } = useTaskMutations();
  const busy = createTask.isPending || updateTask.isPending || deleteTask.isPending || completeTask.isPending || changeStatus.isPending || moveTask.isPending || addDependency.isPending || removeDependency.isPending;

  const blockersData = blockersQuery.data?.data as BlockerAnalysis | undefined;
  const blockerWarnings = Array.isArray(blockersData?.warnings) ? blockersData.warnings : [];
  const activeData = activeQuery.data?.data;
  const archiveData = archiveQuery.data?.data;
  const duplicatesData = duplicatesQuery.data?.data;
  const activeTasks = useMemo<TaskRecord[]>(() => (Array.isArray(activeData) ? (activeData as TaskRecord[]) : []), [activeData]);
  const archiveTasks = useMemo<TaskRecord[]>(() => (Array.isArray(archiveData) ? (archiveData as TaskRecord[]) : []), [archiveData]);
  const tasks = tab === 'archive' ? archiveTasks : activeTasks;
  const duplicates = useMemo<DuplicateGroup[]>(
    () => (Array.isArray(duplicatesData) ? (duplicatesData as DuplicateGroup[]) : []),
    [duplicatesData],
  );
  const duplicateCount = useMemo(() => duplicates.reduce((n, g) => n + 1 + (g.duplicates?.length ?? 0), 0), [duplicates]);
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
  const filteredDuplicates = useMemo(() => duplicates.filter((group) => {
    const relatedTasks = [group.representative, ...(group.duplicates ?? [])].filter(Boolean);
    return relatedTasks.some((task) => taskMatchesSearch(task, search));
  }), [duplicates, search]);
  const activeFilterCount = [search.trim(), statusFilter !== 'all', areaFilter !== 'all', effortFilter !== 'all', dueFrom, dueTo, overdueOnly, sort !== DEFAULT_SORT].filter(Boolean).length;
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
  const boardColumns = useMemo(() => TASK_STATUS_VALUES.map((columnStatus) => ({
    status: columnStatus,
    tasks: taskTree.filter((task) => task.status === columnStatus),
  })), [taskTree]);
  const latestMutationResult = latestResult(removeDependency.data, addDependency.data, moveTask.data, changeStatus.data, completeTask.data, deleteTask.data, updateTask.data, createTask.data);
  const inspectorHistory = [removeDependency.data, addDependency.data, moveTask.data, changeStatus.data, completeTask.data, deleteTask.data, updateTask.data, createTask.data, blockersQuery.data, query.data]
    .filter((result): result is ApiCallResult<unknown> => Boolean(result));

  useEffect(() => {
    if (!latestMutationResult) return;
    announce(mutationAnnouncement(latestMutationResult));
  }, [announce, latestMutationResult]);

  const boardState = useBoardState({
    tasks,
    onMoveTask: (id, body) => moveTask.mutate({ id, body }),
  });

  const showCreatePanel = () => {
    setCreateOpen((open) => {
      const nextOpen = !open;
      window.requestAnimationFrame(() => {
        if (nextOpen) createFormRef.current?.focusTitle();
        else createButtonRef.current?.focus();
      });
      return nextOpen;
    });
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

  const createTaskForStatus = (status: TaskStatus) => {
    setCreateOpen(true);
    window.requestAnimationFrame(() => {
      createFormRef.current?.setParentTaskId('');
      createFormRef.current?.setStatus(status);
      createFormRef.current?.focusTitle();
    });
  };

  const submitCreate = (payload: CreateTaskPayload, onSuccess: () => void) => {
    createTask.mutate(payload, { onSuccess });
  };

  const submitDependency = () => {
    const id = Number(dependencyTaskId);
    const blocksTaskId = Number(dependencyBlocksTaskId);
    if (!Number.isFinite(id) || !Number.isFinite(blocksTaskId) || id === blocksTaskId) return;
    addDependency.mutate({ id, blocksTaskId }, { onSuccess: () => { setDependencyTaskId(''); setDependencyBlocksTaskId(''); } });
  };

  const updateTaskFromCard = (task: TaskRecord, updates: Partial<TaskRecord>) => {
    updateTask.mutate({ id: task.id, body: buildTaskUpdateBody(task, updates) });
  };

  const changeTaskStatus = (id: number, status: TaskStatus) => {
    changeStatus.mutate({ id, status });
  };

  const snoozeFollowUp = (task: TaskRecord) => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    updateTaskFromCard(task, { followUpDate: next.toISOString().slice(0, 10) });
  };

  return (
    <div className="tasks-page" aria-busy={busy}>
      <header className="tasks-planner-shell" aria-label="Project planner controls">
        <div className="tasks-planner-topbar">
          <div className="tasks-planner-title">
            <p className="eyebrow">Task command center</p>
            <h2>Project Planner</h2>
          </div>

          <nav className="planner-view-tabs" aria-label="Planner views">
            <button className={tab !== 'duplicates' && viewMode === 'board' ? 'active' : ''} type="button" onClick={() => setViewMode('board')} disabled={tab === 'duplicates'} aria-pressed={tab !== 'duplicates' && viewMode === 'board'}>Board</button>
            <button className={tab !== 'duplicates' && viewMode === 'list' ? 'active' : ''} type="button" onClick={() => setViewMode('list')} disabled={tab === 'duplicates'} aria-pressed={tab !== 'duplicates' && viewMode === 'list'}>List</button>
            <button type="button" disabled aria-disabled="true">Calendar</button>
            <button type="button" disabled aria-disabled="true">Timeline</button>
            <button type="button" disabled aria-disabled="true">Reports</button>
          </nav>

          <div className="planner-toolbar" aria-label="Planner actions">
            <label className="planner-search" htmlFor="plannerTaskSearch">
              <span className="sr-only">Search tasks</span>
              <input id="plannerTaskSearch" placeholder="Search tasks" value={search} onChange={(e) => setFilterParam('q', e.target.value.trim(), '')} />
            </label>
            <button className="planner-icon-button" type="button" onClick={() => document.getElementById('statusFilter')?.focus()}>
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
            <button className="planner-icon-button" type="button" aria-label="More task actions">•••</button>
            <button ref={createButtonRef} className="button-primary planner-new-task" type="button" onClick={showCreatePanel} disabled={busy}>
              {createOpen ? 'Close new task' : '+ New task'}
            </button>
          </div>
        </div>

        <div className="planner-context-row">
          <p>Capture work, triage effort, and move tasks from active execution to archive without dropping follow-ups.</p>
          <div className="task-stat-strip compact" aria-label="Task counts">
            <span className="task-stat"><strong>{activeTasks.length}</strong> Active</span>
            <span className="task-stat"><strong>{archiveTasks.length}</strong> Archived</span>
            <span className="task-stat"><strong>{duplicateCount}</strong> Duplicates</span>
            <span className="task-stat"><strong>{sortedFilteredTasks.length}</strong> In view</span>
          </div>
        </div>
      </header>

      <BlockerPanel
        warnings={blockerWarnings}
        dependencyCount={blockersData?.dependencyCount ?? 0}
        activeTasks={activeTasks}
        busy={busy}
        dependencyTaskId={dependencyTaskId}
        dependencyBlocksTaskId={dependencyBlocksTaskId}
        onDependencyTaskIdChange={setDependencyTaskId}
        onDependencyBlocksTaskIdChange={setDependencyBlocksTaskId}
        onSubmitDependency={submitDependency}
        onChangeStatus={changeTaskStatus}
        onSnoozeFollowUp={snoozeFollowUp}
      />

      {createOpen && (
        <TaskCreateForm
          ref={createFormRef}
          activeTasks={activeTasks}
          busy={busy}
          isCreating={createTask.isPending}
          onCancel={closeCreatePanel}
          onCreate={submitCreate}
          onInvalidTitle={() => setCreateOpen(true)}
        />
      )}

      <section className="panel task-workspace" aria-labelledby="task-list-title">
        <div className="section-header task-section-header">
          <div>
            <p className="eyebrow">Work queue</p>
            <h3 id="task-list-title">{tab === 'archive' ? 'Archived tasks' : tab === 'duplicates' ? 'Duplicate groups' : 'Active tasks'}</h3>
            <p>{activeFilterCount > 0 ? `${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} / sort applied.` : 'Use filters to quickly find the next task to move.'}</p>
          </div>
          <div className="task-section-actions">
            <div className="task-view-toggle" role="group" aria-label="Task list view">
              <button className={tab === 'active' ? 'active' : ''} type="button" onClick={() => setTab('active')}>Active <span>{activeTasks.length}</span></button>
              <button className={tab === 'archive' ? 'active' : ''} type="button" onClick={() => setTab('archive')}>Archive <span>{archiveTasks.length}</span></button>
              <button className={tab === 'duplicates' ? 'active' : ''} type="button" onClick={() => setTab('duplicates')}>Duplicates <span>{duplicateCount}</span></button>
            </div>
          </div>
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
          disabled={tab === 'duplicates'}
          serializedFilters={serializedFilters}
          onSearchChange={(value) => setFilterParam('q', value.trim(), '')}
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

        <QueryState
          isLoading={query.isLoading || query.isFetching}
          isError={Boolean(query.data && !query.data.ok)}
          isEmpty={!query.isLoading && ((tab === 'duplicates' && filteredDuplicates.length === 0) || (tab !== 'duplicates' && sortedFilteredTasks.length === 0))}
          emptyMessage={activeFilterCount > 0 ? 'No tasks match the current filters.' : 'No tasks available.'}
          successMessage={createTask.data?.ok ? 'Task created successfully.' : undefined}
        />

        {tab === 'duplicates' ? (
          <div className="duplicate-list">
            {filteredDuplicates.map((g, idx) => <div key={`${g.representative?.id ?? 'group'}-${idx}`} className="duplicate-card">
              <p className="eyebrow">Duplicate group #{idx + 1}</p>
              <p><strong>Representative:</strong> #{g.representative?.id} {g.representative?.title}</p>
              <ul>{g.duplicates?.map((d) => <li key={d.id}>#{d.id} {d.title}</li>)}</ul>
            </div>)}
          </div>
        ) : viewMode === 'board' ? (
          <TaskBoard
            columns={boardColumns}
            busy={busy}
            draggingTaskId={boardState.draggingTaskId}
            dropTarget={boardState.dropTarget}
            onDragStart={boardState.handleDragStart}
            onDragOver={boardState.handleDragOver}
            onDragEnd={boardState.handleDragEnd}
            onDrop={boardState.handleDrop}
            onClearDropTarget={boardState.clearDropTarget}
            onMoveTaskTo={boardState.moveTaskTo}
            onStartSubtask={(task: TaskTreeNode) => startSubtask(task)}
            onCreateTaskForStatus={createTaskForStatus}
            onComplete={(taskId) => completeTask.mutate(taskId)}
            onChangeStatus={changeTaskStatus}
            onUpdateTask={updateTaskFromCard}
            onSnoozeFollowUp={snoozeFollowUp}
            onRemoveDependency={(id, blocksTaskId) => removeDependency.mutate({ id, blocksTaskId })}
            onDelete={(taskId) => deleteTask.mutate(taskId)}
          />
        ) : (
          <TaskListView
            tasks={taskTree}
            busy={busy}
            onComplete={(taskId) => completeTask.mutate(taskId)}
            onStartSubtask={(task) => startSubtask(task)}
            onChangeStatus={(id, status) => changeStatus.mutate({ id, status })}
            onSnoozeFollowUp={snoozeFollowUp}
            onRemoveDependency={(id, blocksTaskId) => removeDependency.mutate({ id, blocksTaskId })}
            onDelete={(taskId) => deleteTask.mutate(taskId)}
          />
        )}
      </section>

      <details className="panel task-inspector" open={false}>
        <summary>API request inspector</summary>
        <RequestInspector history={inspectorHistory} result={removeDependency.data ?? addDependency.data ?? moveTask.data ?? changeStatus.data ?? completeTask.data ?? deleteTask.data ?? updateTask.data ?? createTask.data ?? blockersQuery.data ?? query.data ?? null} />
      </details>
    </div>
  );
}
