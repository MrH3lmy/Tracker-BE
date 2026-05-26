import { useState } from 'react';
import { apiDownload, apiJson, type ApiCallResult } from '../apiClient';
import { RequestInspector } from '../components/RequestInspector';

type CalendarAction = 'month' | 'ics';

export function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getUTCFullYear()));
  const [month, setMonth] = useState(String(now.getUTCMonth() + 1));
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [loading, setLoading] = useState<CalendarAction | null>(null);

  const loadMonth = async () => {
    setLoading('month');
    try {
      setResult(await apiJson('GET', `/api/v1/calendar/month?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`));
    } finally {
      setLoading(null);
    }
  };

  const exportIcs = async () => {
    setLoading('ics');
    try {
      setResult(await apiDownload('GET', '/api/v1/calendar/export.ics', 'calendar.ics'));
    } finally {
      setLoading(null);
    }
  };

  return <div><h2>Calendar</h2><div className="row"><input value={year} onChange={(e) => setYear(e.target.value)} placeholder="YYYY" /><input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="M" /><button onClick={loadMonth} disabled={loading !== null}>{loading === 'month' ? 'Loading...' : 'GET month'}</button></div><div className="row"><button onClick={exportIcs} disabled={loading !== null}>{loading === 'ics' ? 'Exporting...' : 'Export ICS'}</button></div><RequestInspector result={result} /></div>;
}
