import type { ApiCallResult } from './apiClient';

interface RequestInspectorProps {
  result: ApiCallResult<unknown> | null;
  history?: ApiCallResult<unknown>[];
}

export function RequestInspector({ result, history = [] }: RequestInspectorProps) {
  if (!result && history.length === 0) {
    return <div className="panel">No request yet.</div>;
  }

  const items = history.length > 0 ? history : result ? [result] : [];

  return (
    <div className="panel">
      <h3>Inspector History ({items.length})</h3>
      {items.map((item, idx) => (
        <div key={`${item.request.method}-${item.request.url}-${idx}`} className="panel inspector-item">
          <h4>{idx === 0 ? 'Latest' : `Previous #${idx}`}</h4>
          <p><strong>URL:</strong> {item.request.url}</p>
          <p><strong>Method:</strong> {item.request.method}</p>
          <p><strong>Payload:</strong></p>
          <pre>{JSON.stringify(item.request.payload ?? null, null, 2)}</pre>

          <p><strong>Status:</strong> {item.status}</p>
          <p><strong>Latency:</strong> {item.latencyMs} ms</p>
          <p><strong>JSON:</strong></p>
          <pre>{JSON.stringify(item.data, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
