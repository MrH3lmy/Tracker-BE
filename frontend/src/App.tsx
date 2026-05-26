import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { apiJson, type ApiCallResult } from './apiClient';
import { RequestInspector } from './RequestInspector';
import './App.css';

type TaskStatus = 'BACKLOG' | 'NOT_STARTED' | 'IN_PROGRESS' | 'WAITING' | 'BLOCKED' | 'DONE' | 'CANCELLED';

interface TaskRecord {
  id: number;
  title: string;
  description?: string;
  status?: TaskStatus;
  archived?: boolean;
  [key: string]: unknown;
}

interface CreateTaskRequest {
  title: string;
  description?: string;
}

interface UpdateTaskRequest {
  title: string;
  description?: string;
}

function DashboardPage() {
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const checkApi = async () => {
    setLoading(true);
    try {
      const response = await apiJson<unknown>('GET', '/api/v1/dashboard');
      setResult(response);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Dashboard</h2>
      <button onClick={checkApi} disabled={loading}>{loading ? 'Checking...' : 'Check API'}</button>
      <RequestInspector result={result} />
    </div>
  );
}

function TasksPage() {
  const [tab, setTab] = useState<'active' | 'archive' | 'duplicates'>('active');
  const [tasksResult, setTasksResult] = useState<ApiCallResult<unknown> | null>(null);
  const [detailResult, setDetailResult] = useState<ApiCallResult<unknown> | null>(null);
  const [inspectorHistory, setInspectorHistory] = useState<ApiCallResult<unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [activeMutation, setActiveMutation] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateTaskRequest>({ title: '', description: '' });
  const [updateForm, setUpdateForm] = useState<UpdateTaskRequest>({ title: '', description: '' });
  const [statusToSet, setStatusToSet] = useState<TaskStatus>('NOT_STARTED');


  const logResult = (entry: ApiCallResult<unknown>) => {
    setInspectorHistory((prev) => [entry, ...prev].slice(0, 10));
  };

  const tabPath = useMemo(() => {
    if (tab === 'archive') return '/api/v1/tasks/archive';
    if (tab === 'duplicates') return '/api/v1/tasks/duplicates';
    return '/api/v1/tasks';
  }, [tab]);

  const loadList = async () => {
    setLoading(true);
    try {
      const response = await apiJson<unknown>('GET', tabPath);
      setTasksResult(response);
      logResult(response);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: number) => {
    const response = await apiJson<unknown>('GET', `/api/v1/tasks/${id}`);
    setDetailResult(response);
    setSelectedTaskId(id);
    setUpdateForm({
      title: String((response.data as { title?: string })?.title ?? ''),
      description: String((response.data as { description?: string })?.description ?? '')
    });
    logResult(response);
  };

  useEffect(() => {
    void loadList();
  }, [tab]);

  const taskRows: TaskRecord[] = Array.isArray(tasksResult?.data)
    ? (tasksResult?.data as TaskRecord[])
    : Array.isArray((tasksResult?.data as { tasks?: TaskRecord[] } | undefined)?.tasks)
      ? ((tasksResult?.data as { tasks?: TaskRecord[] }).tasks ?? [])
      : [];

  const selectedTask = taskRows.find((task) => task.id === selectedTaskId);

  const runMutation = async (label: string, request: Promise<ApiCallResult<unknown>>) => {
    setActiveMutation(label);
    try {
      const response = await request;
      setDetailResult(response);
      logResult(response);
      await loadList();
      if (selectedTaskId !== null) {
        await loadDetail(selectedTaskId);
      }
    } finally {
      setActiveMutation(null);
    }
  };

  const createTask = async () => {
    await runMutation('create', apiJson<unknown>('POST', '/api/v1/tasks', createForm));
    setCreateForm({ title: '', description: '' });
  };

  const updateTask = async (id: number) => {
    await runMutation('update', apiJson<unknown>('PUT', `/api/v1/tasks/${id}`, updateForm));
  };

  const deleteTask = async (id: number) => {
    await runMutation('delete', apiJson<unknown>('DELETE', `/api/v1/tasks/${id}`));
    setSelectedTaskId(null);
  };

  const completeTask = async (id: number) => {
    await runMutation('complete', apiJson<unknown>('PATCH', `/api/v1/tasks/${id}/complete`));
  };

  const changeStatus = async (id: number) => {
    await runMutation('status', apiJson<unknown>('PATCH', `/api/v1/tasks/${id}/status?status=${statusToSet}`));
  };

  return (
    <div>
      <h2>Tasks</h2>
      <div className="row">
        <button disabled={loading || activeMutation !== null} onClick={() => setTab('active')}>Active</button>
        <button disabled={loading || activeMutation !== null} onClick={() => setTab('archive')}>Archive</button>
        <button disabled={loading || activeMutation !== null} onClick={() => setTab('duplicates')}>Duplicates</button>
        <button disabled={loading || activeMutation !== null} onClick={loadList}>{loading ? 'Refreshing...' : 'Refresh'}</button>
      </div>

      <h3>Create Task</h3>
      <div className="row">
        <input placeholder="Title" value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} />
        <input placeholder="Description" value={createForm.description ?? ''} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} />
        <button disabled={activeMutation !== null || !createForm.title.trim()} onClick={createTask}>{activeMutation === 'create' ? 'Creating...' : 'Create (201)'}</button>
      </div>

      <table>
        <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {taskRows.map((task) => (
            <tr key={task.id}>
              <td>{task.id}</td>
              <td>{task.title}</td>
              <td>{String(task.status ?? '')}</td>
              <td className="row">
                <button disabled={activeMutation !== null} onClick={() => void loadDetail(task.id)}>Detail</button>
                <button disabled={activeMutation !== null} onClick={() => void updateTask(task.id)}>{activeMutation === 'update' ? 'Updating...' : 'Update'}</button>
                <button disabled={activeMutation !== null} onClick={() => void completeTask(task.id)}>{activeMutation === 'complete' ? 'Completing...' : 'Complete'}</button>
                <button disabled={activeMutation !== null} onClick={() => void deleteTask(task.id)}>{activeMutation === 'delete' ? 'Deleting...' : 'Delete (204)'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedTask && (
        <div className="panel">
          <h3>Task Detail Actions (#{selectedTask.id})</h3>
          <div className="row">
            <input placeholder="Edit title" value={updateForm.title ?? ''} onChange={(e) => setUpdateForm((p) => ({ ...p, title: e.target.value }))} />
            <input placeholder="Edit description" value={updateForm.description ?? ''} onChange={(e) => setUpdateForm((p) => ({ ...p, description: e.target.value }))} />
            <select value={statusToSet} onChange={(e) => setStatusToSet(e.target.value as TaskStatus)}>
                      {['BACKLOG', 'NOT_STARTED', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'DONE', 'CANCELLED'].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <button disabled={activeMutation !== null} onClick={() => void changeStatus(selectedTask.id)}>{activeMutation === 'status' ? 'Changing...' : 'Set Status'}</button>
          </div>
        </div>
      )}

      <RequestInspector result={detailResult ?? tasksResult} history={inspectorHistory} />
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h2>{title}</h2>
      <p>Scaffolded page.</p>
    </div>
  );
}

const tabs = [
  ['Dashboard', '/dashboard'],
  ['Tasks', '/tasks'],
  ['Planning', '/planning'],
  ['Matrix', '/matrix'],
  ['Calendar', '/calendar'],
  ['Settings', '/settings'],
  ['Import', '/import'],
  ['Error Playground', '/errors']
] as const;

export default function App() {
  return (
    <>
      <nav className="tabs">
        {tabs.map(([label, path]) => (
          <NavLink key={path} to={path} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
            {label}
          </NavLink>
        ))}
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/planning" element={<PlaceholderPage title="Planning" />} />
          <Route path="/matrix" element={<PlaceholderPage title="Matrix" />} />
          <Route path="/calendar" element={<PlaceholderPage title="Calendar" />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
          <Route path="/import" element={<PlaceholderPage title="Import" />} />
          <Route path="/errors" element={<PlaceholderPage title="Error Playground" />} />
        </Routes>
      </main>
    </>
  );
}
