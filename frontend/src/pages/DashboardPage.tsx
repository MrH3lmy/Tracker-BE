import { useState } from 'react';
import { apiJson, type ApiCallResult } from '../apiClient';
import { RequestInspector } from '../components/RequestInspector';

export function DashboardPage() {
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const checkApi = async () => {
    setLoading(true);
    try {
      setResult(await apiJson<unknown>('GET', '/api/v1/dashboard'));
    } finally {
      setLoading(false);
    }
  };

  return <div><h2>Dashboard</h2><button onClick={checkApi} disabled={loading}>{loading ? 'Checking...' : 'Check API'}</button><RequestInspector result={result} /></div>;
}
