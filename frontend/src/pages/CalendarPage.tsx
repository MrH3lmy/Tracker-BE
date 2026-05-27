import { useMemo, useState } from 'react';
import { apiDownload } from '../apiClient';
import { RequestInspector } from '../components/RequestInspector';
import { QueryState } from '../components/QueryState';
import { useCalendarMonthQuery } from '../hooks/useApiQueries';
import { validateCalendarInputs } from '../validation/calendar';

export function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getUTCFullYear()));
  const [month, setMonth] = useState(String(now.getUTCMonth() + 1));
  const [lastResult, setLastResult] = useState<any>(null);
  const [enabled, setEnabled] = useState(false);
  const inputErrors = useMemo(() => validateCalendarInputs(year, month), [year, month]);
  const canLoadMonth = !inputErrors.year && !inputErrors.month;
  const query = useCalendarMonthQuery(year, month, enabled && canLoadMonth);

  return <div><h2>Calendar</h2><div className="row"><input value={year} onChange={(e) => setYear(e.target.value)} placeholder="YYYY" /><input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="M" /><button onClick={() => setEnabled(true)} disabled={!canLoadMonth || query.isFetching}>{query.isFetching ? 'Loading...' : 'GET month'}</button></div>{inputErrors.year && <p className="error">{inputErrors.year}</p>}{inputErrors.month && <p className="error">{inputErrors.month}</p>}<div className="row"><button onClick={async () => setLastResult(await apiDownload('GET', '/api/v1/calendar/export.ics', 'calendar.ics'))} disabled={query.isFetching}>Export ICS</button></div><QueryState isLoading={query.isLoading || query.isFetching} isError={Boolean(query.data && !query.data.ok)} isEmpty={!query.isLoading && Boolean(query.data && !query.data.data)} /><RequestInspector result={lastResult ?? query.data ?? null} /></div>;
}
