import { useMemo, useState } from 'react';
import { RequestInspector } from '../components/RequestInspector';
import { QueryState } from '../components/QueryState';
import { useImportMutations } from '../hooks/useApiQueries';
import { validateImportTasksPayload } from '../validation/import';

export function ImportPage() {
  const [csvPayload, setCsvPayload] = useState('title,description\nExample Task,Imported via CSV');
  const [jsonPayload, setJsonPayload] = useState('{"tasks":[{"title":"Imported Task"}]}');
  const { importCsv, importTasks } = useImportMutations();
  const tasksValidation = useMemo(() => validateImportTasksPayload(jsonPayload), [jsonPayload]);

  return <div><h2>Import</h2><h3>POST /api/v1/import/csv</h3><textarea value={csvPayload} onChange={(e) => setCsvPayload(e.target.value)} rows={6} className="text-block" /><div className="row"><button onClick={() => importCsv.mutate(csvPayload)} disabled={importCsv.isPending || importTasks.isPending}>{importCsv.isPending ? 'Posting...' : 'Post CSV'}</button></div><h3>POST /api/v1/import/tasks</h3><textarea value={jsonPayload} onChange={(e) => setJsonPayload(e.target.value)} rows={8} className="text-block" />{tasksValidation.errors.map((error) => <p key={error} className="error">{error}</p>)}<div className="row"><button onClick={() => tasksValidation.parsed && importTasks.mutate(tasksValidation.parsed)} disabled={tasksValidation.errors.length > 0 || importCsv.isPending || importTasks.isPending}>{importTasks.isPending ? 'Posting...' : 'Post Tasks JSON'}</button></div><QueryState isLoading={importCsv.isPending || importTasks.isPending} isError={Boolean((importCsv.data && !importCsv.data.ok) || (importTasks.data && !importTasks.data.ok))} isEmpty={false} /><RequestInspector result={importTasks.data ?? importCsv.data ?? null} /></div>;
}
