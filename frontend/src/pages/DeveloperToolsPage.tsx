import { useEffect, useMemo, useState } from 'react';
import { clearApiHistory, getApiHistory, subscribeToApiHistory } from '../apiClient';
import { RequestInspector } from '../components/RequestInspector';
import { Button, Card, CardHeader, PageHeader } from '../components/ui';

export function DeveloperToolsPage() {
  const [history, setHistory] = useState(() => getApiHistory());

  useEffect(() => subscribeToApiHistory(() => setHistory(getApiHistory())), []);

  const latestResult = history[0] ?? null;
  const summary = useMemo(() => {
    const successful = history.filter((item) => item.ok).length;
    const failed = history.length - successful;
    const averageLatency = history.length > 0
      ? Math.round(history.reduce((total, item) => total + item.latencyMs, 0) / history.length)
      : 0;

    return { successful, failed, averageLatency };
  }, [history]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Developer Tools"
        description="Inspect recent API calls without rendering diagnostics inside primary task workflows."
        actions={<Button onClick={clearApiHistory} disabled={history.length === 0}>Clear history</Button>}
        className="mb-0"
      />

      <Card aria-labelledby="developer-api-summary-title">
        <CardHeader
          title={<span id="developer-api-summary-title">API request summary</span>}
          description={`The most recent ${history.length} request${history.length === 1 ? '' : 's'} are captured from the shared API client.`}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="API request metrics">
          <article className="rounded-lg border border-line bg-inset/40 px-3.5 py-3">
            <span className="text-xs text-fg-muted">Total</span>
            <strong className="block text-xl font-semibold tracking-tight text-fg tabular-nums">{history.length}</strong>
          </article>
          <article className="rounded-lg border border-line bg-inset/40 px-3.5 py-3">
            <span className="text-xs text-fg-muted">Successful</span>
            <strong className="block text-xl font-semibold tracking-tight text-fg tabular-nums">{summary.successful}</strong>
          </article>
          <article className="rounded-lg border border-line bg-inset/40 px-3.5 py-3">
            <span className="text-xs text-fg-muted">Failed</span>
            <strong className="block text-xl font-semibold tracking-tight text-fg tabular-nums">{summary.failed}</strong>
          </article>
          <article className="rounded-lg border border-line bg-inset/40 px-3.5 py-3">
            <span className="text-xs text-fg-muted">Average latency</span>
            <strong className="block text-xl font-semibold tracking-tight text-fg tabular-nums">{summary.averageLatency} ms</strong>
          </article>
        </div>
      </Card>

      <Card aria-labelledby="developer-inspector-title">
        <CardHeader
          title={<span id="developer-inspector-title">Request inspector</span>}
          description="Use this developer-only view to inspect request metadata, payloads, responses, and errors."
        />
        <RequestInspector result={latestResult} history={history} />
      </Card>
    </div>
  );
}
