import { useState } from 'react';
import { apiJson, type ApiCallResult } from '../apiClient';
import { RequestInspector } from '../components/RequestInspector';

export function MatrixPage() {
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setResult(await apiJson('GET', '/api/v1/matrix'));
    } finally {
      setLoading(false);
    }
  };

  return <div><h2>Matrix</h2><button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'GET /api/v1/matrix'}</button><RequestInspector result={result} /></div>;
}
