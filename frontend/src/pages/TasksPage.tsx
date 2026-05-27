import { useMemo, useState } from 'react';
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
  const query = useTasksQuery(tab);
  const { createTask, updateTask, deleteTask, completeTask, changeStatus } = useTaskMutations();
  const busy = createTask.isPending || updateTask.isPending || deleteTask.isPending || completeTask.isPending || changeStatus.isPending;

  const tasks = (tab === 'duplicates' ? [] : (Array.isArray(query.data?.data) ? query.data?.data : [])) as TaskRecord[];
  const duplicates = (tab === 'duplicates' && Array.isArray(query.data?.data) ? query.data?.data : []) as DuplicateGroup[];
  const duplicateCount = useMemo(() => duplicates.reduce((n, g) => n + 1 + (g.duplicates?.length ?? 0), 0), [duplicates]);

  return <div><h2>Tasks</h2><section className="panel"><h3>Create Task</h3><div className="row"><input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} /><input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} /><select value={status} onChange={(e) => setStatus(e.target.value as any)} disabled={busy}><option value="">(no status)</option>{TASK_STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}</select><button onClick={() => createTask.mutate({ title: title.trim(), description: description || undefined, status: status || undefined })} disabled={busy || !title.trim()}>Create</button></div></section><div className="row"><button onClick={() => setTab('active')}>All Tasks</button><button onClick={() => setTab('archive')}>Archive</button><button onClick={() => setTab('duplicates')}>Duplicates</button></div><QueryState isLoading={query.isLoading || query.isFetching} isError={Boolean(query.data && !query.data.ok)} isEmpty={!query.isLoading && ((tab === 'duplicates' && duplicates.length === 0) || (tab !== 'duplicates' && tasks.length === 0))} />

  {tab === 'duplicates' ? <section className="panel"><h3>Duplicate groups ({duplicates.length}) · Tasks in groups ({duplicateCount})</h3>{duplicates.map((g, idx) => <div key={idx} className="panel inspector-item"><p><strong>Representative:</strong> #{g.representative?.id} {g.representative?.title}</p><ul>{g.duplicates?.map((d) => <li key={d.id}>#{d.id} {d.title}</li>)}</ul></div>)}</section> :
  <section className="panel"><h3>{tab === 'archive' ? 'Archived Tasks' : 'Tasks'} ({tasks.length})</h3><table><thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Actions</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id}><td>{task.id}</td><td>{task.title}</td><td>{task.status ?? '-'}</td><td><div className="row"><button onClick={() => completeTask.mutate(task.id)} disabled={busy}>Complete</button><select disabled={busy} defaultValue="" onChange={(e) => { if (e.target.value && isTaskStatus(e.target.value)) changeStatus.mutate({ id: task.id, status: e.target.value }); }}><option value="">Set status...</option>{TASK_STATUS_VALUES.map((s) => <option key={`${task.id}-${s}`} value={s}>{s}</option>)}</select><button onClick={() => deleteTask.mutate(task.id)} disabled={busy}>Delete</button></div></td></tr>)}</tbody></table></section>}

  <RequestInspector history={[changeStatus.data, completeTask.data, deleteTask.data, updateTask.data, createTask.data, query.data].filter(Boolean) as any} result={changeStatus.data ?? completeTask.data ?? deleteTask.data ?? updateTask.data ?? createTask.data ?? query.data ?? null} />
  </div>;
}
