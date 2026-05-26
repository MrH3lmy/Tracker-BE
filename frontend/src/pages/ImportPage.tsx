import { useMemo, useState } from 'react';
import { apiJson, apiText, type ApiCallResult } from '../apiClient';
import { RequestInspector } from '../components/RequestInspector';
import { validateImportTasksPayload } from '../validation/import';

type ImportAction = 'csv' | 'tasks';

export function ImportPage() {
  const [csvPayload, setCsvPayload] = useState('title,description\nExample Task,Imported via CSV');
  const [jsonPayload, setJsonPayload] = useState('{"tasks":[{"title":"Imported Task"}]}');
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [loading, setLoading] = useState<ImportAction | null>(null);

  const tasksValidation = useMemo(() => validateImportTasksPayload(jsonPayload), [jsonPayload]);
  const canSubmitTasks = loading === null && tasksValidation.errors.length === 0;

  const postCsv = async () => {
    setLoading('csv');
    try { setResult(await apiText('POST', '/api/v1/import/csv', csvPayload, 'text/plain')); } finally { setLoading(null); }
  };
  const postTasks = async () => {
    if (!tasksValidation.parsed || tasksValidation.errors.length > 0) return;
    setLoading('tasks');
    try { setResult(await apiJson('POST', '/api/v1/import/tasks', tasksValidation.parsed)); }
    finally { setLoading(null); }
  };

  return <div><h2>Import</h2><h3>POST /api/v1/import/csv</h3><textarea value={csvPayload} onChange={(e) => setCsvPayload(e.target.value)} rows={6} className="text-block" /><div className="row"><button onClick={postCsv} disabled={loading !== null}>{loading === 'csv' ? 'Posting...' : 'Post CSV'}</button></div><h3>POST /api/v1/import/tasks</h3><textarea value={jsonPayload} onChange={(e) => setJsonPayload(e.target.value)} rows={8} className="text-block" />{tasksValidation.errors.map((error) => <p key={error} className="error">{error}</p>)}<div className="row"><button onClick={postTasks} disabled={!canSubmitTasks}>{loading === 'tasks' ? 'Posting...' : 'Post Tasks JSON'}</button></div><RequestInspector result={result} /></div>;
}
