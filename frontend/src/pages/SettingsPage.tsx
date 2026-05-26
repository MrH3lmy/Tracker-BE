import { useState } from 'react';
import { apiJson, type ApiCallResult } from '../apiClient';
import { RequestInspector } from '../components/RequestInspector';

type SettingsAction = 'get' | 'put';

export function SettingsPage() {
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [body, setBody] = useState('{}');
  const [loading, setLoading] = useState<SettingsAction | null>(null);

  const getSettings = async () => {
    setLoading('get');
    try {
      const res = await apiJson<unknown>('GET', '/api/v1/settings');
      setResult(res);
      setBody(JSON.stringify(res.data ?? {}, null, 2));
    } finally {
      setLoading(null);
    }
  };

  const putSettings = async () => {
    setLoading('put');
    try {
      const parsed = JSON.parse(body);
      setResult(await apiJson('PUT', '/api/v1/settings', parsed));
    } catch (error) {
      setResult({ status: 0, latencyMs: 0, data: { parseError: String(error) }, request: { method: 'PUT', url: '/api/v1/settings', payload: body }, error: 'Invalid JSON payload' });
    } finally {
      setLoading(null);
    }
  };

  return <div><h2>Settings</h2><div className="row"><button onClick={getSettings} disabled={loading !== null}>{loading === 'get' ? 'Loading...' : 'GET settings'}</button><button onClick={putSettings} disabled={loading !== null}>{loading === 'put' ? 'Saving...' : 'PUT settings'}</button></div><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="text-block" /><RequestInspector result={result} /></div>;
}
