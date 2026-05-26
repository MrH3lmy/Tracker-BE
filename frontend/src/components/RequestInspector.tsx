import { Clock3 } from "lucide-react";
import type { ApiExchange } from "../api/client";
import { JsonBlock } from "./JsonBlock";
import { StatusBadge } from "./StatusBadge";

interface RequestInspectorProps {
  exchange: ApiExchange | null;
  loading?: boolean;
}

export function RequestInspector({ exchange, loading = false }: RequestInspectorProps) {
  return (
    <aside className="inspector-panel" aria-label="Request and response inspector">
      <div className="panel-heading">
        <div>
          <h2>Inspector</h2>
          <span>Request and response trace</span>
        </div>
        {loading ? <span className="spinner" aria-label="Loading" /> : null}
      </div>

      <div className="inspector-grid">
        <section className="trace-section">
          <h3>Request</h3>
          <dl className="trace-meta">
            <div>
              <dt>Method</dt>
              <dd>{exchange?.request.method ?? "-"}</dd>
            </div>
            <div>
              <dt>URL</dt>
              <dd className="url-value">{exchange?.request.url ?? "-"}</dd>
            </div>
          </dl>
          <JsonBlock value={exchange?.request.payload ?? null} emptyLabel="No payload" />
        </section>

        <section className="trace-section">
          <h3>Response</h3>
          <div className="response-line">
            <StatusBadge status={exchange?.response.status} ok={exchange?.response.ok} />
            <span className="latency">
              <Clock3 size={14} aria-hidden="true" />
              {exchange ? `${exchange.response.latencyMs} ms` : "-"}
            </span>
          </div>
          {exchange?.error ? <p className="error-text">{exchange.error}</p> : null}
          <JsonBlock value={exchange?.response.json ?? null} />
        </section>
      </div>
    </aside>
  );
}
