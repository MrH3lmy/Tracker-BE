import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import { apiDownload, apiJson, apiText, type ApiCallResult } from './apiClient';
import { RequestInspector } from './RequestInspector';
import { TasksPage } from './pages/TasksPage';
import './App.css';

function DashboardPage() { /* unchanged */
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const checkApi = async () => { setLoading(true); try { setResult(await apiJson<unknown>('GET', '/api/v1/dashboard')); } finally { setLoading(false); } };
  return <div><h2>Dashboard</h2><button onClick={checkApi} disabled={loading}>{loading ? 'Checking...' : 'Check API'}</button><RequestInspector result={result} /></div>;
}

function PlanningPage() {
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const run = async (path: '/api/v1/planning/today' | '/api/v1/planning/weekly') => {
    setLoading(path);
    try { setResult(await apiJson('GET', path)); } finally { setLoading(null); }
  };
  return <div><h2>Planning</h2><div className="row"><button onClick={() => void run('/api/v1/planning/today')} disabled={loading !== null}>{loading === '/api/v1/planning/today' ? 'Loading...' : 'GET today'}</button><button onClick={() => void run('/api/v1/planning/weekly')} disabled={loading !== null}>{loading === '/api/v1/planning/weekly' ? 'Loading...' : 'GET weekly'}</button></div><RequestInspector result={result} /></div>;
}

function MatrixPage() {
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); try { setResult(await apiJson('GET', '/api/v1/matrix')); } finally { setLoading(false); } };
  return <div><h2>Matrix</h2><button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'GET /api/v1/matrix'}</button><RequestInspector result={result} /></div>;
}

function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getUTCFullYear()));
  const [month, setMonth] = useState(String(now.getUTCMonth() + 1));
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const loadMonth = async () => {
    setLoading('month');
    try { setResult(await apiJson('GET', `/api/v1/calendar/month?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`)); } finally { setLoading(null); }
  };
  const exportIcs = async () => {
    setLoading('ics');
    try { setResult(await apiDownload('GET', '/api/v1/calendar/export.ics', 'calendar.ics')); } finally { setLoading(null); }
  };
  return <div><h2>Calendar</h2><div className="row"><input value={year} onChange={(e) => setYear(e.target.value)} placeholder="YYYY" /><input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="M" /><button onClick={loadMonth} disabled={loading !== null}>{loading === 'month' ? 'Loading...' : 'GET month'}</button></div><div className="row"><button onClick={exportIcs} disabled={loading !== null}>{loading === 'ics' ? 'Exporting...' : 'Export ICS'}</button></div><RequestInspector result={result} /></div>;
}

function SettingsPage() {
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [body, setBody] = useState('{}');
  const [loading, setLoading] = useState<string | null>(null);
  const getSettings = async () => {
    setLoading('get');
    try {
      const res = await apiJson<unknown>('GET', '/api/v1/settings');
      setResult(res);
      setBody(JSON.stringify(res.data ?? {}, null, 2));
    } finally { setLoading(null); }
  };
  const putSettings = async () => {
    setLoading('put');
    try {
      const parsed = JSON.parse(body);
      setResult(await apiJson('PUT', '/api/v1/settings', parsed));
    } catch (error) {
      setResult({ status: 0, latencyMs: 0, data: { parseError: String(error) }, request: { method: 'PUT', url: '/api/v1/settings', payload: body }, error: 'Invalid JSON payload' });
    } finally { setLoading(null); }
  };
  return <div><h2>Settings</h2><div className="row"><button onClick={getSettings} disabled={loading !== null}>{loading === 'get' ? 'Loading...' : 'GET settings'}</button><button onClick={putSettings} disabled={loading !== null}>{loading === 'put' ? 'Saving...' : 'PUT settings'}</button></div><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="text-block" /><RequestInspector result={result} /></div>;
}

function ImportPage() {
  const [csvPayload, setCsvPayload] = useState('title,description\nExample Task,Imported via CSV');
  const [jsonPayload, setJsonPayload] = useState('{"tasks":[{"title":"Imported Task"}]}');
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const postCsv = async () => { setLoading('csv'); try { setResult(await apiText('POST', '/api/v1/import/csv', csvPayload, 'text/plain')); } finally { setLoading(null); } };
  const postTasks = async () => {
    setLoading('tasks');
    try { setResult(await apiJson('POST', '/api/v1/import/tasks', JSON.parse(jsonPayload))); }
    catch (error) { setResult({ status: 0, latencyMs: 0, data: { parseError: String(error) }, request: { method: 'POST', url: '/api/v1/import/tasks', payload: jsonPayload }, error: 'Invalid JSON payload' }); }
    finally { setLoading(null); }
  };
  return <div><h2>Import</h2><h3>POST /api/v1/import/csv</h3><textarea value={csvPayload} onChange={(e) => setCsvPayload(e.target.value)} rows={6} className="text-block" /><div className="row"><button onClick={postCsv} disabled={loading !== null}>{loading === 'csv' ? 'Posting...' : 'Post CSV'}</button></div><h3>POST /api/v1/import/tasks</h3><textarea value={jsonPayload} onChange={(e) => setJsonPayload(e.target.value)} rows={8} className="text-block" /><div className="row"><button onClick={postTasks} disabled={loading !== null}>{loading === 'tasks' ? 'Posting...' : 'Post Tasks JSON'}</button></div><RequestInspector result={result} /></div>;
}

function PlaceholderPage({ title }: { title: string }) { return <div><h2>{title}</h2><p>Scaffolded page.</p></div>; }
const tabs = [['Dashboard','/dashboard'],['Tasks','/tasks'],['Planning','/planning'],['Matrix','/matrix'],['Calendar','/calendar'],['Settings','/settings'],['Import','/import'],['Error Playground','/errors']] as const;

export default function App() {
  return <><nav className="tabs">{tabs.map(([label, path]) => <NavLink key={path} to={path} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>{label}</NavLink>)}</nav><main><Routes><Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="/dashboard" element={<DashboardPage />} /><Route path="/tasks" element={<TasksPage />} /><Route path="/planning" element={<PlanningPage />} /><Route path="/matrix" element={<MatrixPage />} /><Route path="/calendar" element={<CalendarPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="/import" element={<ImportPage />} /><Route path="/errors" element={<PlaceholderPage title="Error Playground" />} /></Routes></main></>;
}
