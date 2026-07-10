import { useState } from 'react';
import type { ApiCallResult } from '../apiClient';
import { Badge, Button, Card, type BadgeVariant } from './ui';

interface RequestInspectorProps {
  result: ApiCallResult<unknown> | null;
  history?: ApiCallResult<unknown>[];
}

function statusVariant(status: number): BadgeVariant {
  if (status >= 200 && status < 300) return 'positive';
  if (status >= 400 && status < 600) return 'critical';
  return 'neutral';
}

export function RequestInspector({ result, history = [] }: RequestInspectorProps) {
  const [copyStatus, setCopyStatus] = useState<string>('');

  if (!result && history.length === 0) return <Card className="text-sm text-fg-muted">No request yet.</Card>;

  const items = history.length > 0 ? history : result ? [result] : [];

  const copyText = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopyStatus(`${label} copied.`);
  };

  return (
    <Card aria-live="polite">
      <h3 className="text-sm font-semibold text-fg">Inspector History ({items.length})</h3>
      {copyStatus && <p className="mt-1 text-sm font-medium text-positive" role="status">{copyStatus}</p>}
      <div className="mt-3 flex flex-col gap-3">
        {items.map((item, idx) => (
          <div key={`${item.request.method}-${item.request.url}-${idx}`} className="rounded-lg border border-line p-4">
            <h4 className="text-sm font-semibold text-fg">{idx === 0 ? 'Latest' : `Previous #${idx}`}</h4>
            <div className="mt-2 flex flex-col gap-2 text-sm text-fg-muted">
              <p className="flex flex-wrap items-center gap-2">
                <strong className="text-fg">URL:</strong> <span className="break-all">{item.request.url}</span>
                <Button size="sm" variant="ghost" onClick={() => void copyText('URL', item.request.url)}>Copy URL</Button>
              </p>
              <p><strong className="text-fg">Method:</strong> {item.request.method}</p>
              <p className="flex items-center gap-2">
                <strong className="text-fg">Payload:</strong>
                <Button size="sm" variant="ghost" onClick={() => void copyText('Payload', JSON.stringify(item.request.payload ?? null, null, 2))}>Copy payload</Button>
              </p>
              <pre className="overflow-x-auto rounded-md bg-inset p-3 font-mono text-xs text-fg">{JSON.stringify(item.request.payload ?? null, null, 2)}</pre>
              <p className="flex items-center gap-2"><strong className="text-fg">Status:</strong> <Badge variant={statusVariant(item.status)}>{item.status}</Badge></p>
              <p><strong className="text-fg">Latency:</strong> {item.latencyMs} ms</p>
              {item.error && <p className="text-critical"><strong>Error:</strong> {item.error.message}</p>}
              <p className="flex items-center gap-2">
                <strong className="text-fg">Parsed Response:</strong>
                <Button size="sm" variant="ghost" onClick={() => void copyText('Response', JSON.stringify(item.data, null, 2))}>Copy response</Button>
              </p>
              <pre className="overflow-x-auto rounded-md bg-inset p-3 font-mono text-xs text-fg">{JSON.stringify(item.data, null, 2)}</pre>
              {item.error && (
                <>
                  <p><strong className="text-fg">Raw Failed Response:</strong></p>
                  <pre className="overflow-x-auto rounded-md bg-inset p-3 font-mono text-xs text-fg">{item.rawBody ?? ''}</pre>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
