import { useMemo, useRef, useState } from 'react';
import type { ApiCallResult } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { RequestInspector } from '../components/RequestInspector';
import { BlockerPanel } from '../components/tasks/BlockerPanel';
import { TaskBoard } from '../components/tasks/TaskBoard';
import { TaskCreateForm, type TaskCreateFormHandle } from '../components/tasks/TaskCreateForm';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { TaskListView } from '../components/tasks/TaskListView';
import type { BlockerAnalysis, CreateTaskPayload, DuplicateGroup, FilterValue, TaskRecord, TaskTreeNode, ViewMode } from '../components/tasks/taskTypes';
import { buildTaskTree, taskMatchesSearch, uniqueOptions } from '../components/tasks/taskUtils';
import { useTaskBlockersQuery, useTaskMutations, useTasksQuery, type TaskTab } from '../hooks/useApiQueries';
import { useBoardState } from '../hooks/useBoardState';
import { TASK_STATUS_VALUES } from '../validation/taskStatus';

export function TasksPage() {
  const [tab, setTab] = useState<TaskTab>('active');
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterValue>('all');
  const [areaFilter, setAreaFilter] = useState<FilterValue>('all');
  const [effortFilter, setEffortFilter] = useState<FilterValue>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [dependencyTaskId, setDependencyTaskId] = useState('');
  const [dependencyBlocksTaskId, setDependencyBlocksTaskId] = useState('');
  const createFormRef = useRef<TaskCreateFormHandle>(null);

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
    return true;
  }), [areaFilter, effortFilter, search, statusFilter, tasks]);
  const filteredDuplicates = useMemo(() => duplicates.filter((group) => {
    const relatedTasks = [group.representative, ...(group.duplicates ?? [])].filter(Boolean);
    return relatedTasks.some((task) => taskMatchesSearch(task, search));
  }), [duplicates, search]);
  const activeFilterCount = [search.trim(), statusFilter !== 'all', areaFilter !== 'all', effortFilter !== 'all'].filter(Boolean).length;
  const taskTree = useMemo(() => buildTaskTree(filteredTasks), [filteredTasks]);
  const boardColumns = useMemo(() => TASK_STATUS_VALUES.map((columnStatus) => ({
    status: columnStatus,
    tasks: taskTree.filter((task) => task.status === columnStatus),
  })), [taskTree]);
  const inspectorHistory = [removeDependency.data, addDependency.data, moveTask.data, changeStatus.data, completeTask.data, deleteTask.data, updateTask.data, createTask.data, blockersQuery.data, query.data]
    .filter((result): result is ApiCallResult<unknown> => Boolean(result));

  const boardState = useBoardState({
    tasks,
    onMoveTask: (id, body) => moveTask.mutate({ id, body }),
  });

  const showCreatePanel = () => {
    setCreateOpen((open) => !open);
    window.requestAnimationFrame(() => createFormRef.current?.focusTitle());
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

  const submitDependency = () => {
    const id = Number(dependencyTaskId);
    const blocksTaskId = Number(dependencyBlocksTaskId);
    if (!Number.isFinite(id) || !Number.isFinite(blocksTaskId) || id === blocksTaskId) return;
    addDependency.mutate({ id, blocksTaskId }, { onSuccess: () => { setDependencyTaskId(''); setDependencyBlocksTaskId(''); } });
  };

  const snoozeFollowUp = (task: TaskRecord) => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    updateTask.mutate({ id: task.id, body: { ...task, followUpDate: next.toISOString().slice(0, 10), dependencyIds: task.dependencyIds ?? [] } });
  };

  return (
    <div className="tasks-page" aria-busy={busy}>
      <header className="tasks-hero">
        <div className="tasks-hero-copy">
          <p className="eyebrow">Task command center</p>
          <h2>Tasks</h2>
          <p>Capture work, triage effort, and move tasks from active execution to archive without dropping follow-ups.</p>
          <div className="task-stat-strip" aria-label="Task counts">
            <span className="task-stat"><strong>{activeTasks.length}</strong> Active</span>
            <span className="task-stat"><strong>{archiveTasks.length}</strong> Archived</span>
            <span className="task-stat"><strong>{duplicateCount}</strong> Duplicates</span>
            <span className="task-stat"><strong>{filteredTasks.length}</strong> In view</span>
          </div>
        </div>
        <button className="button-primary" type="button" onClick={showCreatePanel} disabled={busy}>
          {createOpen ? 'Close new task' : 'New task'}
        </button>
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
        onChangeStatus={(id, status) => changeStatus.mutate({ id, status })}
        onSnoozeFollowUp={snoozeFollowUp}
      />

      {createOpen && (
        <TaskCreateForm
          ref={createFormRef}
          activeTasks={activeTasks}
          busy={busy}
          isCreating={createTask.isPending}
          onCancel={() => setCreateOpen(false)}
          onCreate={submitCreate}
          onInvalidTitle={() => setCreateOpen(true)}
        />
      )}

      <section className="panel task-workspace" aria-labelledby="task-list-title">
        <div className="section-header task-section-header">
          <div>
            <p className="eyebrow">Work queue</p>
            <h3 id="task-list-title">{tab === 'archive' ? 'Archived tasks' : tab === 'duplicates' ? 'Duplicate groups' : 'Active tasks'}</h3>
            <p>{activeFilterCount > 0 ? `${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} applied.` : 'Use filters to quickly find the next task to move.'}</p>
          </div>
          <div className="task-header-actions">
            {tab !== 'duplicates' && (
              <div className="task-view-toggle" role="group" aria-label="Task display mode">
                <button className={viewMode === 'board' ? 'active' : ''} type="button" onClick={() => setViewMode('board')}>Board</button>
                <button className={viewMode === 'list' ? 'active' : ''} type="button" onClick={() => setViewMode('list')}>List</button>
              </div>
            )}
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
          areaOptions={areaOptions}
          effortOptions={effortOptions}
          disabled={tab === 'duplicates'}
          onSearchChange={setSearch}
          onStatusFilterChange={setStatusFilter}
          onAreaFilterChange={setAreaFilter}
          onEffortFilterChange={setEffortFilter}
        />

        <QueryState
          isLoading={query.isLoading || query.isFetching}
          isError={Boolean(query.data && !query.data.ok)}
          isEmpty={!query.isLoading && ((tab === 'duplicates' && filteredDuplicates.length === 0) || (tab !== 'duplicates' && filteredTasks.length === 0))}
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
            onDragStart={boardState.handleDragStart}
            onDragEnd={() => boardState.setDraggingTaskId(null)}
            onDrop={boardState.handleDrop}
            onStartSubtask={(task: TaskTreeNode) => startSubtask(task)}
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
