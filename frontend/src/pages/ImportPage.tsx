import { useMemo, useRef, useState } from 'react';
import { RequestInspector } from '../components/RequestInspector';
import { QueryState } from '../components/QueryState';
import { useImportMutations } from '../hooks/useApiQueries';
import { validateImportTasksPayload } from '../validation/import';

type ImportMode = 'csv' | 'json';

export function ImportPage() {
  const [mode, setMode] = useState<ImportMode>('csv');
  const [csvPayload, setCsvPayload] = useState('title,description\nExample Task,Imported via CSV');
  const [jsonPayload, setJsonPayload] = useState('{"tasks":[{"title":"Imported Task"}]}');
  const { importCsv, importTasks } = useImportMutations();
  const tasksValidation = useMemo(() => validateImportTasksPayload(jsonPayload), [jsonPayload]);
  const jsonRef = useRef<HTMLTextAreaElement>(null);

  const busy = importCsv.isPending || importTasks.isPending;
  const activeMutation = mode === 'csv' ? importCsv : importTasks;

  const submitTasks = () => {
    if (!tasksValidation.parsed) {
      jsonRef.current?.focus();
      return;
    }
    importTasks.mutate(tasksValidation.parsed);
  };

  const submitActiveMode = () => {
    if (mode === 'csv') importCsv.mutate(csvPayload);
    else submitTasks();
  };

  return (
    <div className="page-pattern import-page" aria-busy={busy}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Data intake</p>
          <h2>Import</h2>
          <p>Choose a CSV or JSON task import flow, review expected input, and post to the backend.</p>
        </div>
        <button type="button" className="button-primary" onClick={submitActiveMode} disabled={busy || (mode === 'json' && tasksValidation.errors.length > 0)}>
          {activeMutation.isPending ? 'Posting...' : mode === 'csv' ? 'Import CSV' : 'Import tasks JSON'}
        </button>
      </header>

      <section className="page-card main-content-card import-panel" aria-labelledby="import-content-title">
        <div className="section-header">
          <div>
            <h3 id="import-content-title">Import modes</h3>
            <p className="muted">Pick the input format that matches your source data.</p>
          </div>
          <div className="segmented-control" role="group" aria-label="Import mode">
            <button type="button" className={mode === 'csv' ? 'active' : undefined} onClick={() => setMode('csv')} disabled={busy}>CSV</button>
            <button type="button" className={mode === 'json' ? 'active' : undefined} onClick={() => setMode('json')} disabled={busy}>JSON tasks</button>
          </div>
        </div>

        <div className="import-mode-grid">
          <article className={`import-mode-card ${mode === 'csv' ? 'active' : ''}`}>
            <h4>CSV import</h4>
            <p>Use comma-separated rows with a header. A minimal payload starts with <code>title,description</code>, followed by one task per line.</p>
            <button type="button" onClick={() => setMode('csv')} disabled={busy}>Use CSV mode</button>
          </article>
          <article className={`import-mode-card ${mode === 'json' ? 'active' : ''}`}>
            <h4>JSON task import</h4>
            <p>Send an object with a <code>tasks</code> array. Each task must include a non-empty <code>title</code>.</p>
            <button type="button" onClick={() => setMode('json')} disabled={busy}>Use JSON mode</button>
          </article>
        </div>

        {mode === 'csv' ? (
          <div className="import-editor">
            <div className="help-card">
              <strong>Expected CSV input</strong>
              <p>Include a header row. Supported task fields can be supplied as columns, and blank optional values may be left empty.</p>
            </div>
            <label className="field-stack" htmlFor="csvPayload">
              <span>CSV payload</span>
              <textarea id="csvPayload" value={csvPayload} onChange={(event) => setCsvPayload(event.target.value)} rows={8} className="text-block" />
            </label>
            <div className="save-bar">
              <p className="muted">POST plain text to <code>/api/v1/import/csv</code>.</p>
              <button type="button" className="button-primary" onClick={() => importCsv.mutate(csvPayload)} disabled={busy}>{importCsv.isPending ? 'Posting...' : 'Post CSV'}</button>
            </div>
          </div>
        ) : (
          <div className="import-editor">
            <div className={`validation-banner ${tasksValidation.errors.length > 0 ? 'invalid' : 'valid'}`} role="status">
              <strong>{tasksValidation.errors.length > 0 ? 'JSON needs attention' : 'JSON task payload is valid'}</strong>
              <span>Expected shape: <code>{'{"tasks":[{"title":"Imported Task"}]}'}</code></span>
            </div>
            <label className="field-stack" htmlFor="jsonPayload">
              <span>Tasks JSON payload</span>
              <textarea id="jsonPayload" ref={jsonRef} value={jsonPayload} onChange={(event) => setJsonPayload(event.target.value)} rows={10} className="text-block" aria-invalid={tasksValidation.errors.length > 0} />
            </label>
            {tasksValidation.errors.map((error) => <p key={error} className="error" role="status">{error}</p>)}
            <div className="save-bar">
              <p className="muted">POST JSON to <code>/api/v1/import/tasks</code>.</p>
              <button type="button" className="button-primary" onClick={submitTasks} disabled={tasksValidation.errors.length > 0 || busy}>{importTasks.isPending ? 'Posting...' : 'Post tasks JSON'}</button>
            </div>
          </div>
        )}

        <QueryState isLoading={busy} isError={Boolean((importCsv.data && !importCsv.data.ok) || (importTasks.data && !importTasks.data.ok))} isEmpty={false} successMessage={(importCsv.data?.ok || importTasks.data?.ok) ? 'Import request completed successfully.' : undefined} />
      </section>

      <section className="page-card diagnostics-card" aria-labelledby="import-diagnostics-title">
        <h3 id="import-diagnostics-title">Request diagnostics</h3>
        <p className="muted">Latest import request, payload, response, and latency.</p>
        <RequestInspector result={importTasks.data ?? importCsv.data ?? null} />
      </section>
    </div>
  );
}
