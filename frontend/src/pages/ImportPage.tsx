import { useMemo, useRef, useState } from 'react';
import { isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { useImportMutations } from '../hooks/useApiQueries';
import { validateImportTasksPayload } from '../validation/import';
import { Badge, Button, Card, CardHeader, Field, PageHeader, SegmentedControl, Textarea, cn } from '../components/ui';

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
    <div className="flex flex-col gap-5" aria-busy={busy}>
      <PageHeader
        title="Import"
        description="Choose a CSV or JSON task import flow, review expected input, and post to the backend."
        actions={
          <Button variant="primary" onClick={submitActiveMode} disabled={busy || (mode === 'json' && tasksValidation.errors.length > 0)}>
            {activeMutation.isPending ? 'Posting...' : mode === 'csv' ? 'Import CSV' : 'Import tasks JSON'}
          </Button>
        }
        className="mb-0"
      />

      <Card aria-labelledby="import-content-title">
        <CardHeader
          title={<span id="import-content-title">Import modes</span>}
          description="Pick the input format that matches your source data."
          actions={
            <SegmentedControl
              aria-label="Import mode"
              value={mode}
              onValueChange={setMode}
              options={[
                { value: 'csv', label: 'CSV' },
                { value: 'json', label: 'JSON tasks' },
              ]}
            />
          }
        />

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <article className={cn('flex flex-col gap-2 rounded-lg border p-4', mode === 'csv' ? 'border-brand bg-brand-soft/40' : 'border-line')}>
            <h4 className="text-sm font-semibold text-fg">CSV import</h4>
            <p className="text-sm text-fg-muted">Use comma-separated rows with a header. A minimal payload starts with <code>title,description</code>, followed by one task per line.</p>
            <Button size="sm" className="self-start" onClick={() => setMode('csv')} disabled={busy}>Use CSV mode</Button>
          </article>
          <article className={cn('flex flex-col gap-2 rounded-lg border p-4', mode === 'json' ? 'border-brand bg-brand-soft/40' : 'border-line')}>
            <h4 className="text-sm font-semibold text-fg">JSON task import</h4>
            <p className="text-sm text-fg-muted">Send an object with a <code>tasks</code> array. Each task must include a non-empty <code>title</code>.</p>
            <Button size="sm" className="self-start" onClick={() => setMode('json')} disabled={busy}>Use JSON mode</Button>
          </article>
        </div>

        {mode === 'csv' ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-line bg-inset/30 px-4 py-3">
              <strong className="text-sm font-semibold text-fg">Expected CSV input</strong>
              <p className="mt-0.5 text-sm text-fg-muted">Include a header row. Supported task fields can be supplied as columns, and blank optional values may be left empty.</p>
            </div>
            <Field label="CSV payload" htmlFor="csvPayload">
              <Textarea id="csvPayload" value={csvPayload} onChange={(event) => setCsvPayload(event.target.value)} rows={8} className="min-h-0 font-mono text-xs" />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <p className="text-sm text-fg-muted">POST plain text to <code>/api/v1/import/csv</code>.</p>
              <Button variant="primary" onClick={() => importCsv.mutate(csvPayload)} disabled={busy}>{importCsv.isPending ? 'Posting...' : 'Post CSV'}</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-inset/30 px-4 py-3">
              <Badge variant={tasksValidation.errors.length > 0 ? 'critical' : 'positive'}>
                {tasksValidation.errors.length > 0 ? 'Needs attention' : 'Valid'}
              </Badge>
              <span className="text-sm text-fg-muted">Expected shape: <code>{'{"tasks":[{"title":"Imported Task"}]}'}</code></span>
            </div>
            <Field label="Tasks JSON payload" htmlFor="jsonPayload">
              <Textarea id="jsonPayload" ref={jsonRef} value={jsonPayload} onChange={(event) => setJsonPayload(event.target.value)} rows={10} className="min-h-0 font-mono text-xs" aria-invalid={tasksValidation.errors.length > 0} />
            </Field>
            {tasksValidation.errors.map((error) => <p key={error} className="text-sm text-critical" role="status">{error}</p>)}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <p className="text-sm text-fg-muted">POST JSON to <code>/api/v1/import/tasks</code>.</p>
              <Button variant="primary" onClick={submitTasks} disabled={tasksValidation.errors.length > 0 || busy}>{importTasks.isPending ? 'Posting...' : 'Post tasks JSON'}</Button>
            </div>
          </div>
        )}

        <div className="mt-4">
          <QueryState isLoading={busy} isError={isQueryError(importCsv.data) || isQueryError(importTasks.data)} isEmpty={false} successMessage={(importCsv.data?.ok || importTasks.data?.ok) ? 'Import request completed successfully.' : undefined} />
        </div>
      </Card>
    </div>
  );
}
