import { useMemo, useState } from 'react';
import { apiDownload } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { useCalendarMonthQuery } from '../hooks/useApiQueries';
import { validateCalendarInputs } from '../validation/calendar';

interface DaySummary {
  taskCount?: number;
  hasOverdue?: boolean;
  hasImportant?: boolean;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function MonthSummary({ data }: { data: unknown }) {
  if (!isRecord(data)) return <pre>{JSON.stringify(data, null, 2)}</pre>;

  const entries = Object.entries(data).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) return <p className="muted">No tasks are due in this month.</p>;

  return (
    <div className="calendar-summary-grid">
      {entries.map(([date, rawSummary]) => {
        const summary = isRecord(rawSummary) ? rawSummary as DaySummary : {};
        return (
          <article key={date} className="calendar-day-card">
            <div>
              <p className="eyebrow">{date}</p>
              <h4>{summary.taskCount ?? 0} task{summary.taskCount === 1 ? '' : 's'}</h4>
            </div>
            <div className="task-preview-meta">
              {summary.hasImportant && <span className="pill">Important</span>}
              {summary.hasOverdue && <span className="pill warning-pill">Overdue</span>}
              {!summary.hasImportant && !summary.hasOverdue && <span className="pill">Scheduled</span>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getUTCFullYear()));
  const [month, setMonth] = useState(String(now.getUTCMonth() + 1));
  const [enabled, setEnabled] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const inputErrors = useMemo(() => validateCalendarInputs(year, month), [year, month]);
  const canLoadMonth = !inputErrors.year && !inputErrors.month;
  const query = useCalendarMonthQuery(year, month, enabled && canLoadMonth);
  const hasMonthData = Boolean(query.data?.ok && query.data.data);
  const monthLabel = canLoadMonth ? `${monthNames[Number(month) - 1]} ${year}` : 'selected month';

  const exportIcs = async () => {
    setIsExporting(true);
    try {
      await apiDownload('GET', '/api/v1/calendar/export.ics', 'calendar.ics');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="page-pattern calendar-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Calendar tools</p>
          <h2>Calendar</h2>
          <p>Load a month summary for due work, then export all dated tasks as an ICS calendar file.</p>
        </div>
        <button type="button" className="button-primary" onClick={() => setEnabled(true)} disabled={!canLoadMonth || query.isFetching}>
          {query.isFetching ? 'Loading...' : `Load ${monthLabel}`}
        </button>
      </header>

      <section className="page-card main-content-card" aria-labelledby="calendar-content-title">
        <div className="section-header">
          <div>
            <h3 id="calendar-content-title">Month summary</h3>
            <p className="muted">Choose a year and month with compact controls.</p>
          </div>
          <button type="button" className="secondary-action" onClick={exportIcs} disabled={query.isFetching || isExporting}>
            {isExporting ? 'Exporting...' : 'Export ICS'}
          </button>
        </div>

        <div className="calendar-toolbar" aria-label="Calendar month controls">
          <label>
            <span>Year</span>
            <input value={year} onChange={(event) => setYear(event.target.value)} placeholder="YYYY" inputMode="numeric" />
          </label>
          <label>
            <span>Month</span>
            <select value={month} onChange={(event) => setMonth(event.target.value)}>
              {monthNames.map((name, index) => <option key={name} value={String(index + 1)}>{name}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setEnabled(true)} disabled={!canLoadMonth || query.isFetching}>
            {query.isFetching ? 'Loading...' : 'Apply'}
          </button>
        </div>

        {inputErrors.year && <p className="error">{inputErrors.year}</p>}
        {inputErrors.month && <p className="error">{inputErrors.month}</p>}
        <QueryState isLoading={query.isLoading || query.isFetching} isError={Boolean(query.data && !query.data.ok)} isEmpty={!query.isLoading && Boolean(query.data && !query.data.data)} />
        {hasMonthData && <MonthSummary data={query.data?.data} />}
      </section>

    </div>
  );
}
