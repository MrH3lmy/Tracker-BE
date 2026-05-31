import { useMemo, useRef, useState } from 'react';
import type { ApiCallResult } from '../apiClient';
import { RequestInspector } from '../components/RequestInspector';
import { QueryState } from '../components/QueryState';
import { type TaskTab, useTaskMutations, useTasksQuery } from '../hooks/useApiQueries';
import { isTaskStatus, TASK_STATUS_VALUES, type TaskStatus } from '../validation/taskStatus';

interface TaskRecord { id: number; title: string; description?: string; status?: TaskStatus; dueDate?: string; important?: boolean; area?: string; effort?: string; blockedReason?: string; waitingOn?: string; followUpDate?: string; }
interface DuplicateGroup { representative: TaskRecord; duplicates: TaskRecord[]; }

export function TasksPage() {
  const [tab, setTab] = useState<TaskTab>('active');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'' | TaskStatus>('');
  const titleRef = useRef<HTMLInputElement>(null);
  const query = useTasksQuery(tab);
  const { createTask, updateTask, deleteTask, completeTask, changeStatus } = useTaskMutations();
  const busy = createTask.isPending || updateTask.isPending || deleteTask.isPending || completeTask.isPending || changeStatus.isPending;

  const queriedData = query.data?.data;
  const tasks = useMemo<TaskRecord[]>(
    () => (tab === 'duplicates' || !Array.isArray(queriedData) ? [] : (queriedData as TaskRecord[])),
    [queriedData, tab],
  );
  const duplicates = useMemo<DuplicateGroup[]>(
    () => (tab === 'duplicates' && Array.isArray(queriedData) ? (queriedData as DuplicateGroup[]) : []),
    [queriedData, tab],
  );
  const duplicateCount = useMemo(() => duplicates.reduce((n, g) => n + 1 + (g.duplicates?.length ?? 0), 0), [duplicates]);
  const inspectorHistory = [changeStatus.data, completeTask.data, deleteTask.data, updateTask.data, createTask.data, query.data]
    .filter((result): result is ApiCallResult<unknown> => Boolean(result));

  const submitCreate = () => {
    if (!title.trim()) {
      titleRef.current?.focus();
      return;
    }
    createTask.mutate({ title: title.trim(), description: description || undefined, status: status || undefined });
  };

  return <div aria-busy={busy}><h2>Tasks</h2><section className="panel"><h3>Create Task</h3><div className="row"><label htmlFor="taskTitle">Title</label><input id="taskTitle" ref={titleRef} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} aria-invalid={!title.trim()} /><label htmlFor="taskDescription">Description</label><input id="taskDescription" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} /><label htmlFor="taskStatus">Status</label><select id="taskStatus" value={status} onChange={(e) => { const nextStatus = e.target.value; setStatus(isTaskStatus(nextStatus) ? nextStatus : ''); }} disabled={busy}><option value="">(no status)</option>{TASK_STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}</select><button onClick={submitCreate} disabled={busy}>Create</button></div></section><div className="row"><button onClick={() => setTab('active')}>All Tasks</button><button onClick={() => setTab('archive')}>Archive</button><button onClick={() => setTab('duplicates')}>Duplicates</button></div><QueryState isLoading={query.isLoading || query.isFetching} isError={Boolean(query.data && !query.data.ok)} isEmpty={!query.isLoading && ((tab === 'duplicates' && duplicates.length === 0) || (tab !== 'duplicates' && tasks.length === 0))} successMessage={createTask.data?.ok ? 'Task created successfully.' : undefined} />

  {tab === 'duplicates' ? <section className="panel"><h3>Duplicate groups ({duplicates.length}) · Tasks in groups ({duplicateCount})</h3>{duplicates.map((g, idx) => <div key={idx} className="panel inspector-item"><p><strong>Representative:</strong> #{g.representative?.id} {g.representative?.title}</p><ul>{g.duplicates?.map((d) => <li key={d.id}>#{d.id} {d.title}</li>)}</ul></div>)}</section> :
  <section className="panel"><h3>{tab === 'archive' ? 'Archived Tasks' : 'Tasks'} ({tasks.length})</h3><table><thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Actions</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id}><td>{task.id}</td><td>{task.title}</td><td>{task.status ?? '-'}</td><td><div className="row"><button onClick={() => completeTask.mutate(task.id)} disabled={busy}>Complete</button><label htmlFor={`changeStatus-${task.id}`}>Set status</label><select id={`changeStatus-${task.id}`} disabled={busy} defaultValue="" onChange={(e) => { if (e.target.value && isTaskStatus(e.target.value)) changeStatus.mutate({ id: task.id, status: e.target.value }); }}><option value="">Set status...</option>{TASK_STATUS_VALUES.map((s) => <option key={`${task.id}-${s}`} value={s}>{s}</option>)}</select><button onClick={() => deleteTask.mutate(task.id)} disabled={busy}>Delete</button></div></td></tr>)}</tbody></table></section>}

  <RequestInspector history={inspectorHistory} result={changeStatus.data ?? completeTask.data ?? deleteTask.data ?? updateTask.data ?? createTask.data ?? query.data ?? null} />
  </div>;
}
