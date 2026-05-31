import { useMemo, useRef, useState, type DragEvent } from 'react';
import type { ApiCallResult } from '../apiClient';
import { RequestInspector } from '../components/RequestInspector';
import { QueryState } from '../components/QueryState';
import { type TaskTab, useTaskBlockersQuery, useTaskMutations, useTasksQuery } from '../hooks/useApiQueries';
import { isTaskStatus, TASK_STATUS_VALUES, type TaskStatus } from '../validation/taskStatus';

interface TaskRecord { id: number; title: string; description?: string; status?: TaskStatus; dueDate?: string; startDate?: string; estimatedMinutes?: number; actualMinutes?: number; riskLevel?: RiskLevel; riskReason?: string; track?: string; phase?: string; parentTaskId?: number; important?: boolean; area?: string; effort?: string; blockedReason?: string; waitingOn?: string; followUpDate?: string; boardColumnId?: number; position?: number; dependencyIds?: number[]; blockingTaskIds?: number[]; priorityScore?: number; subtaskIds?: number[]; subtaskCount?: number; completedSubtaskCount?: number; subtaskProgressPercent?: number; }
interface TaskTreeNode extends TaskRecord { subtasks: TaskTreeNode[]; }
interface DuplicateGroup { representative: TaskRecord; duplicates: TaskRecord[]; }
interface BlockerWarning { type: string; title: string; taskId?: number; taskTitle?: string; status?: TaskStatus; priorityScore?: number; message: string; recommendation: string; relatedTaskIds?: number[]; }
interface BlockerAnalysis { warnings: BlockerWarning[]; dependencyCount: number; }

type FilterValue = 'all' | string;
type ViewMode = 'board' | 'list';
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const RISK_LEVEL_VALUES: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const AREA_VALUES = ['WORK', 'STUDY', 'PERSONAL', 'HEALTH', 'FAMILY'];
const EFFORT_VALUES = ['QUICK', 'MEDIUM', 'DEEP_WORK', 'LARGE'];

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

const renderDueDate = (task: TaskRecord, overdue = isOverdue(task)) => {
  const formattedDate = formatDate(task.dueDate);
  if (!overdue) return formattedDate;
  return <><span className="task-overdue-label">Overdue</span><span>{formattedDate}</span></>;
};

const uniqueOptions = (tasks: TaskRecord[], key: 'area' | 'effort') => Array.from(new Set(tasks.map((task) => task[key]).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b));

const sortTasksForBoard = <T extends TaskRecord>(tasks: T[]) => [...tasks].sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || a.id - b.id);

const taskMatchesSearch = (task: TaskRecord, searchTerm: string) => {
  const needle = searchTerm.trim().toLowerCase();
  if (!needle) return true;
  return [task.title, task.description, task.area, task.track, task.phase, task.riskReason].some((value) => value?.toLowerCase().includes(needle));
};

const buildTaskTree = (tasks: TaskRecord[]): TaskTreeNode[] => {
  const nodes = new Map<number, TaskTreeNode>();
  tasks.forEach((task) => nodes.set(task.id, { ...task, subtasks: [] }));
  const roots: TaskTreeNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parentTaskId ? nodes.get(node.parentTaskId) : undefined;
    if (parent) parent.subtasks.push(node);
    else roots.push(node);
  });
  nodes.forEach((node) => { node.subtasks = sortTasksForBoard(node.subtasks); });
  return sortTasksForBoard(roots);
};

const subtaskSummary = (task: TaskRecord) => {
  const total = task.subtaskCount ?? task.subtaskIds?.length ?? 0;
  if (total === 0) return null;
  const completed = task.completedSubtaskCount ?? 0;
  const percent = task.subtaskProgressPercent ?? Math.round((completed * 100) / total);
  return `${completed}/${total} subtasks (${percent}%)`;
};

export function TasksPage() {
  const [tab, setTab] = useState<TaskTab>('active');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'' | TaskStatus>('');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [actualMinutes, setActualMinutes] = useState('');
  const [riskLevel, setRiskLevel] = useState<'' | RiskLevel>('');
  const [riskReason, setRiskReason] = useState('');
  const [track, setTrack] = useState('');
  const [phase, setPhase] = useState('');
  const [parentTaskId, setParentTaskId] = useState('');
  const [important, setImportant] = useState(false);
  const [area, setArea] = useState('');
  const [effort, setEffort] = useState('');
  const [blockedReason, setBlockedReason] = useState('');
  const [waitingOn, setWaitingOn] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterValue>('all');
  const [areaFilter, setAreaFilter] = useState<FilterValue>('all');
  const [effortFilter, setEffortFilter] = useState<FilterValue>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dependencyTaskId, setDependencyTaskId] = useState('');
  const [dependencyBlocksTaskId, setDependencyBlocksTaskId] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
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

  const submitCreate = () => {
    if (!title.trim()) {
      setCreateOpen(true);
      titleRef.current?.focus();
      return;
    }
    const toOptionalNumber = (value: string) => {
      if (!value.trim()) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    createTask.mutate({
      title: title.trim(),
      description: description || undefined,
      dueDate: dueDate || undefined,
      startDate: startDate || undefined,
      estimatedMinutes: toOptionalNumber(estimatedMinutes),
      actualMinutes: toOptionalNumber(actualMinutes),
      riskLevel: riskLevel || undefined,
      riskReason: riskReason || undefined,
      track: track || undefined,
      phase: phase || undefined,
      parentTaskId: toOptionalNumber(parentTaskId),
      important,
      area: area || undefined,
      effort: effort || undefined,
      blockedReason: blockedReason || undefined,
      waitingOn: waitingOn || undefined,
      followUpDate: followUpDate || undefined,
      status: status || undefined,
    }, {
      onSuccess: () => {
        setTitle('');
        setDescription('');
        setDueDate('');
        setStartDate('');
        setEstimatedMinutes('');
        setActualMinutes('');
        setRiskLevel('');
        setRiskReason('');
        setTrack('');
        setPhase('');
        setParentTaskId('');
        setImportant(false);
        setArea('');
        setEffort('');
        setBlockedReason('');
        setWaitingOn('');
        setFollowUpDate('');
        setStatus('');
      },
    });
  };

  const showCreatePanel = () => {
    setCreateOpen((open) => !open);
    window.requestAnimationFrame(() => titleRef.current?.focus());
  };

  const startSubtask = (task: TaskRecord) => {
    setParentTaskId(String(task.id));
    setCreateOpen(true);
    window.requestAnimationFrame(() => titleRef.current?.focus());
  };

  const moveTaskTo = (taskId: number, targetStatus: TaskStatus, position: number) => {
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task || !isTaskStatus(targetStatus)) return;
    if (task.status === targetStatus && task.position === position) return;
    moveTask.mutate({ id: taskId, body: { status: targetStatus, position } });
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

  const renderSubtaskProgress = (task: TaskRecord) => {
    const summary = subtaskSummary(task);
    if (!summary) return null;
    return <p className="task-description subtask-progress">{summary}</p>;
  };

  const renderBoardTask = (task: TaskTreeNode, columnStatus: TaskStatus, index: number, depth = 0) => {
    const overdue = isOverdue(task);
    return (
      <article
        key={task.id}
        className={`task-board-card ${task.important ? 'task-row-important' : ''} ${overdue ? 'task-row-overdue' : ''} ${draggingTaskId === task.id ? 'dragging' : ''}`.trim()}
        draggable={!busy}
        onDragStart={(event) => handleDragStart(event, task.id)}
        onDragEnd={() => setDraggingTaskId(null)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(event, columnStatus, index)}
        style={{ marginLeft: depth ? `${depth * 1.25}rem` : undefined }}
      >
        <div className="task-board-card-title">
          <strong>#{task.id} {task.title}</strong>
          {task.important && <span className="task-important-pill">Important</span>}
        </div>
        {task.description && <p className="task-description">{task.description}</p>}
        {renderSubtaskProgress(task)}
        {(task.dependencyIds?.length || task.blockingTaskIds?.length || task.parentTaskId) ? <p className="task-description">Parent {task.parentTaskId ? `#${task.parentTaskId}` : '—'} · Blocked by {task.dependencyIds?.map((id) => `#${id}`).join(', ') || '—'} · Blocks {task.blockingTaskIds?.map((id) => `#${id}`).join(', ') || '—'}</p> : null}
        <dl className="task-board-meta">
          <div><dt>Start</dt><dd>{formatDate(task.startDate)}</dd></div>
          <div><dt>Due</dt><dd className={overdue ? 'task-date-overdue' : ''}>{renderDueDate(task, overdue)}</dd></div>
          <div><dt>Estimate</dt><dd>{formatValue(task.estimatedMinutes)}</dd></div>
          <div><dt>Actual</dt><dd>{formatValue(task.actualMinutes)}</dd></div>
          <div><dt>Risk</dt><dd>{formatValue(task.riskLevel)}</dd></div>
          <div><dt>Track</dt><dd>{formatValue(task.track)}</dd></div>
          <div><dt>Phase</dt><dd>{formatValue(task.phase)}</dd></div>
          <div><dt>Area</dt><dd>{formatValue(task.area)}</dd></div>
          <div><dt>Effort</dt><dd>{formatValue(task.effort)}</dd></div>
          <div><dt>Score</dt><dd>{formatValue(task.priorityScore)}</dd></div>
        </dl>
        <div className="task-actions"><button type="button" onClick={() => startSubtask(task)} disabled={busy}>Add subtask</button></div>
        {task.subtasks.length > 0 && <div className="subtask-list">{task.subtasks.map((subtask, subtaskIndex) => renderBoardTask(subtask, columnStatus, subtaskIndex, depth + 1))}</div>}
      </article>
    );
  };

  const renderListTask = (task: TaskTreeNode, depth = 0) => {
    const overdue = isOverdue(task);
    return (
      <article key={task.id} className={`task-list-card ${task.important ? 'task-row-important' : ''} ${overdue ? 'task-row-overdue' : ''}`.trim()} style={{ marginLeft: depth ? `${depth * 1.25}rem` : undefined }}>
        <div className="task-list-primary">
          <span className="task-id">#{task.id}</span>
          <div>
            <div className="task-card-title">
              <strong>{task.title}</strong>
              {task.important && <span className="task-important-pill">Important</span>}
            </div>
            {task.description && <p className="task-description">{task.description}</p>}
            {renderSubtaskProgress(task)}
          </div>
        </div>
        <div className="task-list-metric" data-label="Status"><span className={`status-badge task-status-badge status-task-${(task.status ?? 'unknown').toLowerCase().replaceAll('_', '-')}`}>{task.status ?? 'No status'}</span></div>
        <div className="task-list-metric" data-label="Due date"><span className={overdue ? 'task-date-overdue' : ''}>{renderDueDate(task, overdue)}</span></div>
        <div className="task-list-metric" data-label="Estimate">{formatValue(task.estimatedMinutes)}</div>
        <div className="task-list-metric" data-label="Risk"><span>{formatValue(task.riskLevel)}</span>{task.riskReason ? <p className="task-description">{task.riskReason}</p> : null}</div>
        <div className="task-actions" aria-label={`Actions for ${task.title}`}>
          <button type="button" onClick={() => completeTask.mutate(task.id)} disabled={busy}>Complete</button>
          <button type="button" onClick={() => startSubtask(task)} disabled={busy}>Add subtask</button>
          <label htmlFor={`changeStatus-${task.id}`} className="sr-only">Set status</label>
          <select id={`changeStatus-${task.id}`} disabled={busy} defaultValue="" onChange={(e) => { if (e.target.value && isTaskStatus(e.target.value)) changeStatus.mutate({ id: task.id, status: e.target.value }); }}>
            <option value="">Set status...</option>
            {TASK_STATUS_VALUES.map((s) => <option key={`${task.id}-${s}`} value={s}>{s}</option>)}
          </select>
          <button type="button" onClick={() => snoozeFollowUp(task)} disabled={busy}>Follow up tomorrow</button>
          {task.dependencyIds?.map((blocksTaskId) => <button key={`${task.id}-${blocksTaskId}`} type="button" onClick={() => removeDependency.mutate({ id: task.id, blocksTaskId })} disabled={busy}>Unlink #{blocksTaskId}</button>)}
          <button type="button" onClick={() => deleteTask.mutate(task.id)} disabled={busy}>Delete</button>
        </div>
        <details className="task-card-details">
          <summary>More details</summary>
          <dl className="task-detail-grid">
            <div><dt>Start date</dt><dd>{formatDate(task.startDate)}</dd></div>
            <div><dt>Actual</dt><dd>{formatValue(task.actualMinutes)}</dd></div>
            <div><dt>Track</dt><dd>{formatValue(task.track)}</dd></div>
            <div><dt>Phase</dt><dd>{formatValue(task.phase)}</dd></div>
            <div><dt>Parent</dt><dd>{task.parentTaskId ? `#${task.parentTaskId}` : '—'}</dd></div>
            <div><dt>Area</dt><dd>{formatValue(task.area)}</dd></div>
            <div><dt>Effort</dt><dd>{formatValue(task.effort)}</dd></div>
            <div><dt>Waiting on</dt><dd>{formatValue(task.waitingOn ?? task.blockedReason)}</dd></div>
            <div><dt>Blocked by</dt><dd>{task.dependencyIds?.map((id) => `#${id}`).join(', ') || '—'}</dd></div>
            <div><dt>Blocks</dt><dd>{task.blockingTaskIds?.map((id) => `#${id}`).join(', ') || '—'}</dd></div>
            <div><dt>Follow-up</dt><dd>{formatDate(task.followUpDate)}</dd></div>
          </dl>
        </details>
        {task.subtasks.length > 0 && <div className="subtask-list">{task.subtasks.map((subtask) => renderListTask(subtask, depth + 1))}</div>}
      </article>
    );
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

      {blockerWarnings.length > 0 && (
        <section className="panel blocker-panel" aria-labelledby="blocker-warnings-title">
          <div className="section-header">
            <div>
              <p className="eyebrow">Blocker radar</p>
              <h3 id="blocker-warnings-title">{blockerWarnings.length} blocker warning{blockerWarnings.length === 1 ? '' : 's'}</h3>
              <p>{blockersData?.dependencyCount ?? 0} dependency link{blockersData?.dependencyCount === 1 ? '' : 's'} tracked.</p>
            </div>
          </div>
          <div className="blocker-warning-grid">
            {blockerWarnings.slice(0, 6).map((warning, index) => {
              const task = warning.taskId ? activeTasks.find((candidate) => candidate.id === warning.taskId) : undefined;
              return (
                <article className="blocker-warning-card" key={`${warning.type}-${warning.taskId ?? index}-${index}`}>
                  <p className="eyebrow">{warning.type.replaceAll('_', ' ')}</p>
                  <h4>{warning.title}</h4>
                  <p><strong>{warning.taskId ? `#${warning.taskId} ${warning.taskTitle ?? ''}` : 'Dependency chain'}</strong></p>
                  <p>{warning.message}</p>
                  <p>{warning.recommendation}</p>
                  {warning.relatedTaskIds && warning.relatedTaskIds.length > 0 && <p>Related: {warning.relatedTaskIds.map((id) => `#${id}`).join(', ')}</p>}
                  {task && (
                    <div className="task-actions">
                      <button type="button" disabled={busy} onClick={() => changeStatus.mutate({ id: task.id, status: 'IN_PROGRESS' })}>Start task</button>
                      <button type="button" disabled={busy} onClick={() => snoozeFollowUp(task)}>Follow up tomorrow</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel dependency-panel" aria-labelledby="dependency-links-title">
        <div>
          <p className="eyebrow">Dependency links</p>
          <h3 id="dependency-links-title">Add a blocker relationship</h3>
          <p>Choose the task that is waiting, then the task that blocks it.</p>
        </div>
        <div className="task-toolbar">
          <label htmlFor="dependencyTaskId"><span>Waiting task</span><select id="dependencyTaskId" value={dependencyTaskId} onChange={(e) => setDependencyTaskId(e.target.value)} disabled={busy}><option value="">Select task...</option>{activeTasks.map((task) => <option key={`wait-${task.id}`} value={task.id}>#{task.id} {task.title}</option>)}</select></label>
          <label htmlFor="dependencyBlocksTaskId"><span>Blocked by</span><select id="dependencyBlocksTaskId" value={dependencyBlocksTaskId} onChange={(e) => setDependencyBlocksTaskId(e.target.value)} disabled={busy}><option value="">Select blocker...</option>{activeTasks.map((task) => <option key={`blocks-${task.id}`} value={task.id}>#{task.id} {task.title}</option>)}</select></label>
          <button type="button" className="button-primary" onClick={submitDependency} disabled={busy || !dependencyTaskId || !dependencyBlocksTaskId || dependencyTaskId === dependencyBlocksTaskId}>Link dependency</button>
        </div>
      </section>

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
            <label htmlFor="taskStartDate">Start date</label>
            <input id="taskStartDate" type="date" value={startDate} max={dueDate || undefined} onChange={(e) => setStartDate(e.target.value)} disabled={busy} />
            <label htmlFor="taskDueDate">Due date</label>
            <input id="taskDueDate" type="date" value={dueDate} min={startDate || undefined} onChange={(e) => setDueDate(e.target.value)} disabled={busy} />
            <label htmlFor="taskEstimatedMinutes">Estimated minutes</label>
            <input id="taskEstimatedMinutes" type="number" min="0" step="15" placeholder="120" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} disabled={busy} />
            <label htmlFor="taskActualMinutes">Actual minutes</label>
            <input id="taskActualMinutes" type="number" min="0" step="15" placeholder="90" value={actualMinutes} onChange={(e) => setActualMinutes(e.target.value)} disabled={busy} />
            <label htmlFor="taskRiskLevel">Risk level</label>
            <select id="taskRiskLevel" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as '' | RiskLevel)} disabled={busy}>
              <option value="">(default low)</option>
              {RISK_LEVEL_VALUES.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
            <label htmlFor="taskRiskReason">Risk reason</label>
            <input id="taskRiskReason" placeholder="Dependency, uncertainty, or schedule concern" value={riskReason} onChange={(e) => setRiskReason(e.target.value)} disabled={busy} maxLength={500} />
            <label htmlFor="taskTrack">Track</label>
            <input id="taskTrack" placeholder="Product, marketing, migration" value={track} onChange={(e) => setTrack(e.target.value)} disabled={busy} maxLength={120} />
            <label htmlFor="taskPhase">Phase</label>
            <input id="taskPhase" placeholder="Discovery, build, launch" value={phase} onChange={(e) => setPhase(e.target.value)} disabled={busy} maxLength={120} />
            <label htmlFor="taskParentTask">Parent task</label>
            <select id="taskParentTask" value={parentTaskId} onChange={(e) => setParentTaskId(e.target.value)} disabled={busy}>
              <option value="">No parent</option>
              {activeTasks.map((task) => <option key={`parent-${task.id}`} value={task.id}>#{task.id} {task.title}</option>)}
            </select>
            <label htmlFor="taskImportant">Important</label>
            <input id="taskImportant" type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} disabled={busy} />
            <label htmlFor="taskArea">Area</label>
            <select id="taskArea" value={area} onChange={(e) => setArea(e.target.value)} disabled={busy}>
              <option value="">(default personal)</option>
              {AREA_VALUES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <label htmlFor="taskEffort">Effort</label>
            <select id="taskEffort" value={effort} onChange={(e) => setEffort(e.target.value)} disabled={busy}>
              <option value="">(default medium)</option>
              {EFFORT_VALUES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <label htmlFor="taskBlockedReason">Blocked reason</label>
            <input id="taskBlockedReason" placeholder="Why this task is blocked" value={blockedReason} onChange={(e) => setBlockedReason(e.target.value)} disabled={busy} />
            <label htmlFor="taskWaitingOn">Waiting on</label>
            <input id="taskWaitingOn" placeholder="Person, vendor, or event" value={waitingOn} onChange={(e) => setWaitingOn(e.target.value)} disabled={busy} />
            <label htmlFor="taskFollowUpDate">Follow-up date</label>
            <input id="taskFollowUpDate" type="date" value={followUpDate} min={startDate || undefined} onChange={(e) => setFollowUpDate(e.target.value)} disabled={busy} />
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
                  {column.tasks.map((task, index) => renderBoardTask(task, column.status, index))}
                  {column.tasks.length === 0 && <p className="task-board-empty">Drop tasks here.</p>}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="task-table-shell">
            <div className="task-table" aria-label="Task list">
              <div className="task-list-header">
                <span>Task</span>
                <span>Status</span>
                <span>Due</span>
                <span>Estimate</span>
                <span>Risk</span>
                <span>Actions</span>
              </div>
              <div className="task-list-body">
                {taskTree.map((task) => renderListTask(task))}
              </div>
            </div>
          </div>
        )}
      </section>

      <details className="panel task-inspector" open={false}>
        <summary>API request inspector</summary>
        <RequestInspector history={inspectorHistory} result={removeDependency.data ?? addDependency.data ?? moveTask.data ?? changeStatus.data ?? completeTask.data ?? deleteTask.data ?? updateTask.data ?? createTask.data ?? blockersQuery.data ?? query.data ?? null} />
      </details>
    </div>
  );
}
