import { useState } from 'react';
import { RequestInspector } from '../components/RequestInspector';
import { QueryState } from '../components/QueryState';
import { useMatrixQuery } from '../hooks/useApiQueries';

export function MatrixPage() {
  const [enabled, setEnabled] = useState(false);
  const query = useMatrixQuery(enabled);
  return <div><h2>Matrix</h2><button onClick={() => setEnabled(true)} disabled={query.isFetching}>{query.isFetching ? 'Loading...' : 'GET /api/v1/matrix'}</button><QueryState isLoading={query.isLoading || query.isFetching} isError={Boolean(query.data && !query.data.ok)} isEmpty={!query.isLoading && Boolean(query.data && !query.data.data)} /><RequestInspector result={query.data ?? null} /></div>;
}
