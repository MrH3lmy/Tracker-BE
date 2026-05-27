import { useState } from 'react';
import type { ApiCallResult } from '../apiClient';

interface RequestInspectorProps {
  result: ApiCallResult<unknown> | null;
  history?: ApiCallResult<unknown>[];
}

function statusClass(status: number): 'status-2xx' | 'status-4xx' | 'status-5xx' | 'status-other' {
  if (status >= 200 && status < 300) return 'status-2xx';
  if (status >= 400 && status < 500) return 'status-4xx';
  if (status >= 500 && status < 600) return 'status-5xx';
  return 'status-other';
}

export function RequestInspector({ result, history = [] }: RequestInspectorProps) {
  const [copyStatus, setCopyStatus] = useState<string>('');

  if (!result && history.length === 0) return <div className="panel">No request yet.</div>;

  const items = history.length > 0 ? history : result ? [result] : [];

  const copyText = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopyStatus(`${label} copied.`);
  };

  return (
    <div className="panel" aria-live="polite">
      <h3>Inspector History ({items.length})</h3>
      {copyStatus && <p className="success" role="status">{copyStatus}</p>}
      {items.map((item, idx) => (
        <div key={`${item.request.method}-${item.request.url}-${idx}`} className="panel inspector-item">
          <h4>{idx === 0 ? 'Latest' : `Previous #${idx}`}</h4>
          <p><strong>URL:</strong> {item.request.url} <button onClick={() => void copyText('URL', item.request.url)}>Copy URL</button></p>
          <p><strong>Method:</strong> {item.request.method}</p>
          <p><strong>Payload:</strong> <button onClick={() => void copyText('Payload', JSON.stringify(item.request.payload ?? null, null, 2))}>Copy payload</button></p>
          <pre>{JSON.stringify(item.request.payload ?? null, null, 2)}</pre>
          <p><strong>Status:</strong> <span className={`status-badge ${statusClass(item.status)}`}>{item.status}</span></p>
          <p><strong>Latency:</strong> {item.latencyMs} ms</p>
          {item.error && <p className="error"><strong>Error:</strong> {item.error.message}</p>}
          <p><strong>Parsed Response:</strong> <button onClick={() => void copyText('Response', JSON.stringify(item.data, null, 2))}>Copy response</button></p>
          <pre>{JSON.stringify(item.data, null, 2)}</pre>
          {item.error && (
            <>
              <p><strong>Raw Failed Response:</strong></p>
              <pre>{item.rawBody ?? ''}</pre>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
