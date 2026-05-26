import { useCallback, useMemo, useState } from 'react';
import { apiJson, type ApiCallResult } from '../apiClient';
import { RequestInspector } from '../components/RequestInspector';
import { isTaskStatus, TASK_STATUS_VALUES, type TaskStatus } from '../validation/taskStatus';

type TaskTab = 'active' | 'archive' | 'duplicates';
interface TaskRecord { id: number; title: string; description?: string; status?: TaskStatus; dueDate?: string; important?: boolean; area?: string; effort?: string; blockedReason?: string; waitingOn?: string; followUpDate?: string; }
interface DuplicateGroup { representative: TaskRecord; duplicates: TaskRecord[]; }
interface TaskFormState { title: string; description: string; status: '' | TaskStatus; }
const statusOptions: TaskStatus[] = [...TASK_STATUS_VALUES];

export function TasksPage() {
  const [tab, setTab] = useState<TaskTab>('active');
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTaskSnapshot, setEditingTaskSnapshot] = useState<TaskRecord | null>(null);
  const [createForm, setCreateForm] = useState<TaskFormState>({ title: '', description: '', status: '' });
  const [updateForm, setUpdateForm] = useState<TaskFormState>({ title: '', description: '', status: '' });
  const [inspectorHistory, setInspectorHistory] = useState<ApiCallResult<unknown>[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const isBusy = busyAction !== null;

  const pushResult = useCallback((result: ApiCallResult<unknown>) => {
    setInspectorHistory((prev) => [result, ...prev].slice(0, 20));
  }, []);

  const fetchTab = useCallback(async (nextTab: TaskTab) => {
    const path = nextTab === 'archive' ? '/api/v1/tasks/archive' : nextTab === 'duplicates' ? '/api/v1/tasks/duplicates' : '/api/v1/tasks';
    const result = await apiJson<unknown>('GET', path);
    pushResult(result);
    if (nextTab === 'duplicates') {
      setDuplicates(Array.isArray(result.data) ? (result.data as DuplicateGroup[]) : []);
      setTasks([]);
    } else {
      setTasks(Array.isArray(result.data) ? (result.data as TaskRecord[]) : []);
      setDuplicates([]);
    }
  }, [pushResult]);

  const runAction = useCallback(async (label: string, run: () => Promise<ApiCallResult<unknown>>, refresh = true, refreshTab?: TaskTab) => {
    setBusyAction(label);
    try {
      const result = await run();
      pushResult(result);
      if (refresh) await fetchTab(refreshTab ?? tab);
    } finally {
      setBusyAction(null);
    }
  }, [fetchTab, pushResult, tab]);

  const selectTab = async (nextTab: TaskTab) => {
    setTab(nextTab);
    setBusyAction(`load-${nextTab}`);
    try {
      await fetchTab(nextTab);
    } finally {
      setBusyAction(null);
    }
  };

  const createTask = async () => {
    if (!createForm.title.trim()) return;
    await runAction('create', () => apiJson('POST', '/api/v1/tasks', { title: createForm.title.trim(), description: createForm.description || undefined, status: createForm.status || undefined }), true, 'active');
    setCreateForm({ title: '', description: '', status: '' });
    setTab('active');
  };
  const startEdit = (task: TaskRecord) => { setEditingTaskId(task.id); setEditingTaskSnapshot(task); setUpdateForm({ title: task.title, description: task.description ?? '', status: task.status ?? '' }); };
  const saveUpdate = async () => {
    if (editingTaskId === null || !updateForm.title.trim()) return;
    await runAction('update', () => apiJson('PUT', `/api/v1/tasks/${editingTaskId}`, {
      title: updateForm.title.trim(),
      description: updateForm.description || undefined,
      status: updateForm.status || undefined,
      dueDate: editingTaskSnapshot?.dueDate ?? null,
      important: editingTaskSnapshot?.important ?? false,
      area: editingTaskSnapshot?.area ?? null,
      effort: editingTaskSnapshot?.effort ?? null,
      blockedReason: editingTaskSnapshot?.blockedReason ?? null,
      waitingOn: editingTaskSnapshot?.waitingOn ?? null,
      followUpDate: editingTaskSnapshot?.followUpDate ?? null,
    }));
    setEditingTaskId(null);
    setEditingTaskSnapshot(null);
  };
  const removeTask = async (id: number) => { if (!window.confirm(`Delete task #${id}? This cannot be undone.`)) return; await runAction(`delete-${id}`, () => apiJson('DELETE', `/api/v1/tasks/${id}`)); };
  const markComplete = async (id: number) => runAction(`complete-${id}`, () => apiJson('PATCH', `/api/v1/tasks/${id}/complete`));
  const changeStatus = async (id: number, status: string) => {
    if (!isTaskStatus(status)) return;
    await runAction(`status-${id}`, () => apiJson('PATCH', `/api/v1/tasks/${id}/status?status=${encodeURIComponent(status)}`));
  };
  const duplicateCount = useMemo(() => duplicates.reduce((n, g) => n + 1 + (g.duplicates?.length ?? 0), 0), [duplicates]);

  return <div><h2>Tasks</h2>
    <section className="panel"><h3>Create Task</h3><div className="row">
      <input placeholder="Title" value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} disabled={isBusy} />
      <input placeholder="Description" value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} disabled={isBusy} />
      <select value={createForm.status} onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value as TaskFormState['status'] }))} disabled={isBusy}><option value="">(no status)</option>{statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      <button onClick={() => void createTask()} disabled={isBusy || !createForm.title.trim()}>{busyAction === 'create' ? 'Creating...' : 'Create'}</button>
    </div></section>
    <div className="row"><button onClick={() => void selectTab('active')} disabled={isBusy}>{busyAction === 'load-active' ? 'Loading...' : 'All Tasks'}</button><button onClick={() => void selectTab('archive')} disabled={isBusy}>{busyAction === 'load-archive' ? 'Loading...' : 'Archive'}</button><button onClick={() => void selectTab('duplicates')} disabled={isBusy}>{busyAction === 'load-duplicates' ? 'Loading...' : 'Duplicates'}</button></div>

    {tab === 'duplicates' ? <section className="panel"><h3>Duplicate groups ({duplicates.length}) · Tasks in groups ({duplicateCount})</h3>{duplicates.map((g, idx) => <div key={idx} className="panel inspector-item"><p><strong>Representative:</strong> #{g.representative?.id} {g.representative?.title}</p><ul>{g.duplicates?.map((d) => <li key={d.id}>#{d.id} {d.title}</li>)}</ul></div>)}</section> :
    <section className="panel"><h3>{tab === 'archive' ? 'Archived Tasks' : 'Tasks'} ({tasks.length})</h3><table><thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Actions</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id}><td>{task.id}</td><td>{task.title}</td><td>{task.status ?? '-'}</td><td><div className="row"><button onClick={() => startEdit(task)} disabled={isBusy}>Edit</button><button onClick={() => void markComplete(task.id)} disabled={isBusy}>{busyAction === `complete-${task.id}` ? 'Completing...' : 'Complete'}</button><select disabled={isBusy} defaultValue="" onChange={(e) => { if (e.target.value) void changeStatus(task.id, e.target.value); }}><option value="">Set status...</option>{statusOptions.map((s) => <option key={`${task.id}-${s}`} value={s}>{s}</option>)}</select><button onClick={() => void removeTask(task.id)} disabled={isBusy}>{busyAction === `delete-${task.id}` ? 'Deleting...' : 'Delete'}</button></div></td></tr>)}</tbody></table></section>}

    {editingTaskId !== null && <section className="panel"><h3>Update Task #{editingTaskId}</h3><div className="row"><input placeholder="Title" value={updateForm.title} onChange={(e) => setUpdateForm((p) => ({ ...p, title: e.target.value }))} disabled={isBusy} /><input placeholder="Description" value={updateForm.description} onChange={(e) => setUpdateForm((p) => ({ ...p, description: e.target.value }))} disabled={isBusy} /><select value={updateForm.status} onChange={(e) => setUpdateForm((p) => ({ ...p, status: e.target.value as TaskFormState['status'] }))} disabled={isBusy}><option value="">(no status)</option>{statusOptions.map((s) => <option key={`edit-${s}`} value={s}>{s}</option>)}</select><button onClick={() => void saveUpdate()} disabled={isBusy || !updateForm.title.trim()}>{busyAction === 'update' ? 'Saving...' : 'Save'}</button><button onClick={() => { setEditingTaskId(null); setEditingTaskSnapshot(null); }} disabled={isBusy}>Cancel</button></div></section>}

    <RequestInspector history={inspectorHistory} result={inspectorHistory[0] ?? null} />
  </div>;
}
