import { useState } from 'react';
import { apiJson, apiText, type ApiCallResult } from '../apiClient';
import { RequestInspector } from '../components/RequestInspector';

type ImportAction = 'csv' | 'tasks';

export function ImportPage() {
  const [csvPayload, setCsvPayload] = useState('title,description\nExample Task,Imported via CSV');
  const [jsonPayload, setJsonPayload] = useState('{"tasks":[{"title":"Imported Task"}]}');
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [loading, setLoading] = useState<ImportAction | null>(null);

  const postCsv = async () => {
    setLoading('csv');
    try { setResult(await apiText('POST', '/api/v1/import/csv', csvPayload, 'text/plain')); } finally { setLoading(null); }
  };
  const postTasks = async () => {
    setLoading('tasks');
    try { setResult(await apiJson('POST', '/api/v1/import/tasks', JSON.parse(jsonPayload))); }
    catch (error) { setResult({ status: 0, latencyMs: 0, data: { parseError: String(error) }, request: { method: 'POST', url: '/api/v1/import/tasks', payload: jsonPayload }, error: 'Invalid JSON payload' }); }
    finally { setLoading(null); }
  };

  return <div><h2>Import</h2><h3>POST /api/v1/import/csv</h3><textarea value={csvPayload} onChange={(e) => setCsvPayload(e.target.value)} rows={6} className="text-block" /><div className="row"><button onClick={postCsv} disabled={loading !== null}>{loading === 'csv' ? 'Posting...' : 'Post CSV'}</button></div><h3>POST /api/v1/import/tasks</h3><textarea value={jsonPayload} onChange={(e) => setJsonPayload(e.target.value)} rows={8} className="text-block" /><div className="row"><button onClick={postTasks} disabled={loading !== null}>{loading === 'tasks' ? 'Posting...' : 'Post Tasks JSON'}</button></div><RequestInspector result={result} /></div>;
}
