import { useMemo, useRef, useState, type DragEvent } from 'react';
import type { ApiCallResult } from '../apiClient';
import { RequestInspector } from '../components/RequestInspector';
import { QueryState } from '../components/QueryState';
import { type TaskTab, useTaskMutations, useTasksQuery } from '../hooks/useApiQueries';
import { isTaskStatus, TASK_STATUS_VALUES, type TaskStatus } from '../validation/taskStatus';

interface TaskRecord { id: number; title: string; description?: string; status?: TaskStatus; dueDate?: string; important?: boolean; area?: string; effort?: string; blockedReason?: string; waitingOn?: string; followUpDate?: string; boardColumnId?: number; position?: number; }
interface DuplicateGroup { representative: TaskRecord; duplicates: TaskRecord[]; }

type FilterValue = 'all' | string;
type ViewMode = 'board' | 'list';

const formatValue = (value?: string | boolean | number | null) => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return value ? String(value) : '—';
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const isOverdue = (task: TaskRecord) => {
  if (!task.dueDate || task.status === 'DONE' || task.status === 'CANCELLED') return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
};

const uniqueOptions = (tasks: TaskRecord[], key: 'area' | 'effort') => Array.from(new Set(tasks.map((task) => task[key]).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b));

const sortTasksForBoard = (tasks: TaskRecord[]) => [...tasks].sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || a.id - b.id);

const taskMatchesSearch = (task: TaskRecord, searchTerm: string) => {
  const needle = searchTerm.trim().toLowerCase();
  if (!needle) return true;
  return [task.title, task.description, task.area].some((value) => value?.toLowerCase().includes(needle));
};

export function TasksPage() {
  const [tab, setTab] = useState<TaskTab>('active');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'' | TaskStatus>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterValue>('all');
  const [areaFilter, setAreaFilter] = useState<FilterValue>('all');
  const [effortFilter, setEffortFilter] = useState<FilterValue>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const activeQuery = useTasksQuery('active');
  const archiveQuery = useTasksQuery('archive');
  const duplicatesQuery = useTasksQuery('duplicates');
  const query = tab === 'active' ? activeQuery : tab === 'archive' ? archiveQuery : duplicatesQuery;
  const { createTask, updateTask, deleteTask, completeTask, changeStatus, moveTask } = useTaskMutations();
  const busy = createTask.isPending || updateTask.isPending || deleteTask.isPending || completeTask.isPending || changeStatus.isPending || moveTask.isPending;

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
  const boardColumns = useMemo(() => TASK_STATUS_VALUES.map((columnStatus) => ({
    status: columnStatus,
    tasks: sortTasksForBoard(filteredTasks.filter((task) => task.status === columnStatus)),
  })), [filteredTasks]);
  const inspectorHistory = [moveTask.data, changeStatus.data, completeTask.data, deleteTask.data, updateTask.data, createTask.data, query.data]
    .filter((result): result is ApiCallResult<unknown> => Boolean(result));

  const submitCreate = () => {
    if (!title.trim()) {
      setCreateOpen(true);
      titleRef.current?.focus();
      return;
    }
    createTask.mutate({ title: title.trim(), description: description || undefined, status: status || undefined });
  };

  const showCreatePanel = () => {
    setCreateOpen((open) => !open);
    window.requestAnimationFrame(() => titleRef.current?.focus());
  };

  const moveTaskTo = (taskId: number, targetStatus: TaskStatus, position: number) => {
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task || !isTaskStatus(targetStatus)) return;
    if (task.status === targetStatus && task.position === position) return;
    moveTask.mutate({ id: taskId, body: { status: targetStatus, position } });
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, taskId: number) => {
    setDraggingTaskId(taskId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(taskId));
  };

  const handleDrop = (event: DragEvent<HTMLElement>, targetStatus: TaskStatus, position: number) => {
    event.preventDefault();
    event.stopPropagation();
    const taskId = Number(event.dataTransfer.getData('text/plain') || draggingTaskId);
    setDraggingTaskId(null);
    if (!Number.isFinite(taskId)) return;
    moveTaskTo(taskId, targetStatus, position);
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

      {createOpen && (
        <section className="panel task-create-panel" aria-labelledby="create-task-title">
          <div>
            <p className="eyebrow">Quick capture</p>
            <h3 id="create-task-title">Create task</h3>
          </div>
          <div className="task-create-grid">
            <label htmlFor="taskTitle">Title</label>
            <input id="taskTitle" ref={titleRef} placeholder="Draft launch checklist" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} aria-invalid={!title.trim()} />
            <label htmlFor="taskDescription">Description</label>
            <textarea id="taskDescription" placeholder="Add context, acceptance criteria, or notes" value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} rows={3} />
            <label htmlFor="taskStatus">Status</label>
            <select id="taskStatus" value={status} onChange={(e) => { const nextStatus = e.target.value; setStatus(isTaskStatus(nextStatus) ? nextStatus : ''); }} disabled={busy}>
              <option value="">(no status)</option>
              {TASK_STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="task-create-actions">
            <button className="button-primary" type="button" onClick={submitCreate} disabled={busy}>{createTask.isPending ? 'Creating...' : 'Create task'}</button>
            <button type="button" onClick={() => setCreateOpen(false)} disabled={busy}>Cancel</button>
          </div>
        </section>
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

        <div className="task-toolbar" aria-label="Task filters">
          <label className="task-search" htmlFor="taskSearch">
            <span>Search</span>
            <input id="taskSearch" placeholder="Title, description, or area" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <label htmlFor="statusFilter">
            <span>Status</span>
            <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} disabled={tab === 'duplicates'}>
              <option value="all">All statuses</option>
              {TASK_STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label htmlFor="areaFilter">
            <span>Area</span>
            <select id="areaFilter" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} disabled={tab === 'duplicates'}>
              <option value="all">All areas</option>
              {areaOptions.map((area) => <option key={area} value={area}>{area}</option>)}
            </select>
          </label>
          <label htmlFor="effortFilter">
            <span>Effort</span>
            <select id="effortFilter" value={effortFilter} onChange={(e) => setEffortFilter(e.target.value)} disabled={tab === 'duplicates'}>
              <option value="all">All effort</option>
              {effortOptions.map((effort) => <option key={effort} value={effort}>{effort}</option>)}
            </select>
          </label>
        </div>

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
          <div className="task-board" aria-label="Task status board">
            {boardColumns.map((column) => (
              <section key={column.status} className="task-board-column" onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, column.status, column.tasks.length)}>
                <header className="task-board-column-header">
                  <span className={`status-badge task-status-badge status-task-${column.status.toLowerCase().replaceAll('_', '-')}`}>{column.status}</span>
                  <strong>{column.tasks.length}</strong>
                </header>
                <div className="task-board-card-list">
                  {column.tasks.map((task, index) => {
                    const overdue = isOverdue(task);
                    return (
                      <article
                        key={task.id}
                        className={`task-board-card ${task.important ? 'task-row-important' : ''} ${overdue ? 'task-row-overdue' : ''} ${draggingTaskId === task.id ? 'dragging' : ''}`.trim()}
                        draggable={!busy}
                        onDragStart={(event) => handleDragStart(event, task.id)}
                        onDragEnd={() => setDraggingTaskId(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleDrop(event, column.status, index)}
                      >
                        <div className="task-board-card-title">
                          <strong>#{task.id} {task.title}</strong>
                          {task.important && <span className="task-important-pill">Important</span>}
                        </div>
                        {task.description && <p className="task-description">{task.description}</p>}
                        <dl className="task-board-meta">
                          <div><dt>Due</dt><dd className={overdue ? 'task-date-overdue' : ''}>{formatDate(task.dueDate)}</dd></div>
                          <div><dt>Area</dt><dd>{formatValue(task.area)}</dd></div>
                          <div><dt>Effort</dt><dd>{formatValue(task.effort)}</dd></div>
                        </dl>
                      </article>
                    );
                  })}
                  {column.tasks.length === 0 && <p className="task-board-empty">Drop tasks here.</p>}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="task-table-shell">
            <table className="task-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Due date</th>
                  <th>Important</th>
                  <th>Area</th>
                  <th>Effort</th>
                  <th>Waiting on</th>
                  <th>Follow-up</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const overdue = isOverdue(task);
                  return (
                    <tr key={task.id} className={`${task.important ? 'task-row-important' : ''} ${overdue ? 'task-row-overdue' : ''}`.trim()}>
                      <td data-label="ID">#{task.id}</td>
                      <td data-label="Title">
                        <strong>{task.title}</strong>
                        {task.description && <p className="task-description">{task.description}</p>}
                      </td>
                      <td data-label="Status"><span className={`status-badge task-status-badge status-task-${(task.status ?? 'unknown').toLowerCase().replaceAll('_', '-')}`}>{task.status ?? 'No status'}</span></td>
                      <td data-label="Due date"><span className={overdue ? 'task-date-overdue' : ''}>{formatDate(task.dueDate)}</span></td>
                      <td data-label="Important">{task.important ? <span className="task-important-pill">Important</span> : '—'}</td>
                      <td data-label="Area">{formatValue(task.area)}</td>
                      <td data-label="Effort">{formatValue(task.effort)}</td>
                      <td data-label="Waiting on">{formatValue(task.waitingOn ?? task.blockedReason)}</td>
                      <td data-label="Follow-up">{formatDate(task.followUpDate)}</td>
                      <td data-label="Actions">
                        <div className="task-actions">
                          <button type="button" onClick={() => completeTask.mutate(task.id)} disabled={busy}>Complete</button>
                          <label htmlFor={`changeStatus-${task.id}`} className="sr-only">Set status</label>
                          <select id={`changeStatus-${task.id}`} disabled={busy} defaultValue="" onChange={(e) => { if (e.target.value && isTaskStatus(e.target.value)) changeStatus.mutate({ id: task.id, status: e.target.value }); }}>
                            <option value="">Set status...</option>
                            {TASK_STATUS_VALUES.map((s) => <option key={`${task.id}-${s}`} value={s}>{s}</option>)}
                          </select>
                          <button type="button" onClick={() => deleteTask.mutate(task.id)} disabled={busy}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <details className="panel task-inspector" open={false}>
        <summary>API request inspector</summary>
        <RequestInspector history={inspectorHistory} result={moveTask.data ?? changeStatus.data ?? completeTask.data ?? deleteTask.data ?? updateTask.data ?? createTask.data ?? query.data ?? null} />
      </details>
    </div>
  );
}
