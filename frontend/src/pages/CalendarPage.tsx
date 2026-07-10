import { useMemo, useState } from 'react';
import { apiDownload } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { useCalendarMonthQuery } from '../hooks/useApiQueries';
import { validateCalendarInputs } from '../validation/calendar';
import { Badge, Button, Card, Field, Input, PageHeader, Select } from '../components/ui';
import { Download } from '../components/ui/icons';

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
  if (!isRecord(data)) return <pre className="overflow-x-auto rounded-lg bg-inset p-3 font-mono text-xs text-fg-muted">{JSON.stringify(data, null, 2)}</pre>;

  const entries = Object.entries(data).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) return <p className="text-sm text-fg-muted">No tasks are due in this month.</p>;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {entries.map(([date, rawSummary]) => {
        const summary = isRecord(rawSummary) ? rawSummary as DaySummary : {};
        return (
          <article key={date} className="flex flex-col gap-2 rounded-lg border border-line bg-card p-3.5 shadow-2xs">
            <div>
              <p className="text-xs font-medium text-fg-subtle tabular-nums">{date}</p>
              <h4 className="mt-0.5 text-sm font-semibold text-fg tabular-nums">{summary.taskCount ?? 0} task{summary.taskCount === 1 ? '' : 's'}</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {summary.hasImportant && <Badge variant="caution">Important</Badge>}
              {summary.hasOverdue && <Badge variant="critical">Overdue</Badge>}
              {!summary.hasImportant && !summary.hasOverdue && <Badge>Scheduled</Badge>}
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
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Calendar"
        description="Load a month summary for due work, then export all dated tasks as an ICS calendar file."
        actions={
          <Button variant="primary" onClick={() => setEnabled(true)} disabled={!canLoadMonth || query.isFetching}>
            {query.isFetching ? 'Loading...' : `Load ${monthLabel}`}
          </Button>
        }
        className="mb-0"
      />

      <Card aria-labelledby="calendar-content-title">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="calendar-content-title" className="text-base font-semibold text-fg">Month summary</h3>
            <p className="mt-0.5 text-sm text-fg-muted">Choose a year and month, then load the due-work summary.</p>
          </div>
          <Button onClick={exportIcs} disabled={query.isFetching || isExporting}>
            <Download className="h-4 w-4" aria-hidden />
            {isExporting ? 'Exporting...' : 'Export ICS'}
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3" aria-label="Calendar month controls">
          <Field label="Year" htmlFor="calendarYear" error={inputErrors.year} className="w-28">
            <Input id="calendarYear" value={year} onChange={(event) => setYear(event.target.value)} placeholder="YYYY" inputMode="numeric" aria-invalid={Boolean(inputErrors.year)} />
          </Field>
          <Field label="Month" htmlFor="calendarMonth" error={inputErrors.month} className="w-44">
            <Select id="calendarMonth" value={month} onChange={(event) => setMonth(event.target.value)} aria-invalid={Boolean(inputErrors.month)}>
              {monthNames.map((name, index) => <option key={name} value={String(index + 1)}>{name}</option>)}
            </Select>
          </Field>
          <Button className="mb-px" onClick={() => setEnabled(true)} disabled={!canLoadMonth || query.isFetching}>
            {query.isFetching ? 'Loading...' : 'Apply'}
          </Button>
        </div>

        <QueryState isLoading={query.isLoading || query.isFetching} isError={Boolean(query.data && !query.data.ok)} isEmpty={!query.isLoading && Boolean(query.data && !query.data.data)} />
        {hasMonthData && <MonthSummary data={query.data?.data} />}
      </Card>
    </div>
  );
}
