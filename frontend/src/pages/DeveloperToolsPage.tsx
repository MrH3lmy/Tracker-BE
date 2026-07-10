import { useEffect, useMemo, useState } from 'react';
import { clearApiHistory, getApiHistory, subscribeToApiHistory } from '../apiClient';
import { RequestInspector } from '../components/RequestInspector';
import { PrimitivesGallery } from '../components/dev/PrimitivesGallery';

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
    <div className="page-pattern developer-tools-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Developer tooling</p>
          <h2>Developer Tools</h2>
          <p>Inspect recent API calls without rendering diagnostics inside primary task workflows.</p>
        </div>
        <button type="button" onClick={clearApiHistory} disabled={history.length === 0}>Clear history</button>
      </header>

      <section className="page-card diagnostics-card" aria-labelledby="developer-api-summary-title">
        <div className="section-header">
          <div>
            <h3 id="developer-api-summary-title">API request summary</h3>
            <p className="muted">The most recent {history.length} request{history.length === 1 ? '' : 's'} are captured from the shared API client.</p>
          </div>
        </div>
        <div className="metric-grid compact-metrics" aria-label="API request metrics">
          <article className="metric-card">
            <span>Total</span>
            <strong>{history.length}</strong>
          </article>
          <article className="metric-card">
            <span>Successful</span>
            <strong>{summary.successful}</strong>
          </article>
          <article className="metric-card">
            <span>Failed</span>
            <strong>{summary.failed}</strong>
          </article>
          <article className="metric-card">
            <span>Average latency</span>
            <strong>{summary.averageLatency} ms</strong>
          </article>
        </div>
      </section>

      <section className="page-card diagnostics-card" aria-labelledby="developer-inspector-title">
        <h3 id="developer-inspector-title">Request inspector</h3>
        <p className="muted">Use this developer-only view to inspect request metadata, payloads, responses, and errors.</p>
        <RequestInspector result={latestResult} history={history} />
      </section>

      <PrimitivesGallery />
    </div>
  );
}
