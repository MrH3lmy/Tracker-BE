import { useMemo, useRef, useState } from 'react';
import { RequestInspector } from '../components/RequestInspector';
import { QueryState } from '../components/QueryState';
import { useImportMutations } from '../hooks/useApiQueries';
import { validateImportTasksPayload } from '../validation/import';

export function ImportPage() {
  const [csvPayload, setCsvPayload] = useState('title,description\nExample Task,Imported via CSV');
  const [jsonPayload, setJsonPayload] = useState('{"tasks":[{"title":"Imported Task"}]}');
  const { importCsv, importTasks } = useImportMutations();
  const tasksValidation = useMemo(() => validateImportTasksPayload(jsonPayload), [jsonPayload]);
  const jsonRef = useRef<HTMLTextAreaElement>(null);

  const busy = importCsv.isPending || importTasks.isPending;

  const submitTasks = () => {
    if (!tasksValidation.parsed) {
      jsonRef.current?.focus();
      return;
    }
    importTasks.mutate(tasksValidation.parsed);
  };

  return <div aria-busy={busy}><h2>Import</h2><h3>POST /api/v1/import/csv</h3><label htmlFor="csvPayload">CSV payload</label><textarea id="csvPayload" value={csvPayload} onChange={(e) => setCsvPayload(e.target.value)} rows={6} className="text-block" /><div className="row"><button onClick={() => importCsv.mutate(csvPayload)} disabled={busy}>{importCsv.isPending ? 'Posting...' : 'Post CSV'}</button></div><h3>POST /api/v1/import/tasks</h3><label htmlFor="jsonPayload">Tasks JSON payload</label><textarea id="jsonPayload" ref={jsonRef} value={jsonPayload} onChange={(e) => setJsonPayload(e.target.value)} rows={8} className="text-block" aria-invalid={tasksValidation.errors.length > 0} />{tasksValidation.errors.map((error) => <p key={error} className="error" role="status">{error}</p>)}<div className="row"><button onClick={submitTasks} disabled={tasksValidation.errors.length > 0 || busy}>{importTasks.isPending ? 'Posting...' : 'Post Tasks JSON'}</button></div><QueryState isLoading={busy} isError={Boolean((importCsv.data && !importCsv.data.ok) || (importTasks.data && !importTasks.data.ok))} isEmpty={false} successMessage={(importCsv.data?.ok || importTasks.data?.ok) ? 'Import request completed successfully.' : undefined} /><RequestInspector result={importTasks.data ?? importCsv.data ?? null} /></div>;
}
