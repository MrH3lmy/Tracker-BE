import { useState } from 'react';
import { RequestInspector } from '../components/RequestInspector';
import { QueryState } from '../components/QueryState';
import { latestResult, usePlanningTodayQuery, usePlanningWeeklyQuery } from '../hooks/useApiQueries';

export function PlanningPage() {
  const [selected, setSelected] = useState<'today' | 'weekly'>('today');
  const today = usePlanningTodayQuery(selected === 'today');
  const weekly = usePlanningWeeklyQuery(selected === 'weekly');
  const active = selected === 'today' ? today : weekly;
  const result = latestResult(today.data, weekly.data);

  return <div><h2>Planning</h2><div className="row"><button onClick={() => setSelected('today')} disabled={active.isFetching}>GET today</button><button onClick={() => setSelected('weekly')} disabled={active.isFetching}>GET weekly</button></div><QueryState isLoading={active.isLoading || active.isFetching} isError={Boolean(active.data && !active.data.ok)} isEmpty={!active.isLoading && Boolean(active.data && !active.data.data)} /><RequestInspector result={result} /></div>;
}
