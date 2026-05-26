import { useState } from 'react';
import { apiJson, type ApiCallResult } from '../apiClient';
import { RequestInspector } from '../components/RequestInspector';

type PlanningPath = '/api/v1/planning/today' | '/api/v1/planning/weekly';

export function PlanningPage() {
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [loading, setLoading] = useState<PlanningPath | null>(null);

  const run = async (path: PlanningPath) => {
    setLoading(path);
    try {
      setResult(await apiJson('GET', path));
    } finally {
      setLoading(null);
    }
  };

  return <div><h2>Planning</h2><div className="row"><button onClick={() => void run('/api/v1/planning/today')} disabled={loading !== null}>{loading === '/api/v1/planning/today' ? 'Loading...' : 'GET today'}</button><button onClick={() => void run('/api/v1/planning/weekly')} disabled={loading !== null}>{loading === '/api/v1/planning/weekly' ? 'Loading...' : 'GET weekly'}</button></div><RequestInspector result={result} /></div>;
}
