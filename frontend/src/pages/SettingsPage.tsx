import { useMemo, useState } from 'react';
import { apiJson, type ApiCallResult } from '../apiClient';
import { RequestInspector } from '../components/RequestInspector';
import { validateSettingsPayload } from '../validation/settings';

type SettingsAction = 'get' | 'put';

export function SettingsPage() {
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [body, setBody] = useState('{}');
  const [loading, setLoading] = useState<SettingsAction | null>(null);

  const bodyValidation = useMemo(() => validateSettingsPayload(body), [body]);
  const canSubmit = loading === null && bodyValidation.errors.length === 0;

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
    if (!bodyValidation.parsed || bodyValidation.errors.length > 0) return;
    setLoading('put');
    try {
      setResult(await apiJson('PUT', '/api/v1/settings', bodyValidation.parsed));
    } finally {
      setLoading(null);
    }
  };

  return <div><h2>Settings</h2><div className="row"><button onClick={getSettings} disabled={loading !== null}>{loading === 'get' ? 'Loading...' : 'GET settings'}</button><button onClick={putSettings} disabled={!canSubmit}>{loading === 'put' ? 'Saving...' : 'PUT settings'}</button></div><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="text-block" />{bodyValidation.errors.map((error) => <p key={error} className="error">{error}</p>)}<RequestInspector result={result} /></div>;
}
