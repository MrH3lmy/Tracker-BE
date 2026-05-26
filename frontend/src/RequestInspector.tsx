import type { ApiCallResult } from './apiClient';

interface RequestInspectorProps {
  result: ApiCallResult<unknown> | null;
}

export function RequestInspector({ result }: RequestInspectorProps) {
  if (!result) {
    return <div className="panel">No request yet.</div>;
  }

  return (
    <div className="panel">
      <h3>Request</h3>
      <p><strong>URL:</strong> {result.request.url}</p>
      <p><strong>Method:</strong> {result.request.method}</p>
      <p><strong>Payload:</strong></p>
      <pre>{JSON.stringify(result.request.payload ?? null, null, 2)}</pre>

      <h3>Response</h3>
      <p><strong>Status:</strong> {result.status}</p>
      <p><strong>Latency:</strong> {result.latencyMs} ms</p>
      <p><strong>JSON:</strong></p>
      <pre>{JSON.stringify(result.data, null, 2)}</pre>
    </div>
  );
}
