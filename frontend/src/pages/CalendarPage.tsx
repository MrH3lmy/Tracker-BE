import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiDownload, isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { MonthGrid, type MonthGridTask } from '../components/calendar/MonthGrid';
import { useCalendarMonthTasksQuery, useTaskMutations } from '../hooks/useApiQueries';
import { useQuickCapture } from '../quickCaptureContext';
import { useUndoToast } from '../undoToastContext';
import { formatDateOnly } from '../lib/dateOnly';
import { Button, PageHeader } from '../components/ui';
import { Download } from '../components/ui/icons';
import { SectionTabs } from '../components/SectionTabs';
import { CALENDAR_VIEW_TABS } from '../router/routes';

const monthLabelFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();
  const { openQuickCapture } = useQuickCapture();
  const { showUndo } = useUndoToast();
  const { updateTaskDueDate } = useTaskMutations();

  const query = useCalendarMonthTasksQuery(String(year), String(month), true);
  const tasksByDay = useMemo(() => {
    const data = query.data?.data;
    if (!data || typeof data !== 'object') return {};
    return data as Record<string, MonthGridTask[]>;
  }, [query.data]);
  const hasData = Object.keys(tasksByDay).length > 0;

  const handleTaskDrop = (taskId: number, newDateKey: string) => {
    const previousEntry = Object.entries(tasksByDay).find(([, tasks]) => tasks.some((task) => task.id === taskId));
    const previousDateKey = previousEntry?.[0];
    const title = previousEntry?.[1].find((task) => task.id === taskId)?.title ?? 'Task';
    if (previousDateKey === newDateKey) return;

    updateTaskDueDate.mutate({ id: taskId, dueDate: newDateKey }, {
      onSuccess: (result) => {
        if (!result.ok || !previousDateKey) return;
        showUndo(`"${title}" moved to ${formatDateOnly(newDateKey)}.`, () => updateTaskDueDate.mutate({ id: taskId, dueDate: previousDateKey }));
      },
    });
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth() + 1);
  };

  const goToToday = () => {
    setYear(now.getUTCFullYear());
    setMonth(now.getUTCMonth() + 1);
  };

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTabs items={CALENDAR_VIEW_TABS} ariaLabel="Calendar view" />
      </div>
      <PageHeader
        title="Calendar"
        description={monthLabelFormatter.format(new Date(Date.UTC(year, month - 1, 1)))}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">Previous</Button>
            <Button size="sm" onClick={goToToday}>Today</Button>
            <Button size="sm" onClick={() => shiftMonth(1)} aria-label="Next month">Next</Button>
            <Button size="sm" onClick={exportIcs} disabled={isExporting}>
              <Download className="h-4 w-4" aria-hidden />
              {isExporting ? 'Exporting...' : 'Export ICS'}
            </Button>
          </div>
        }
        className="mb-0"
      />

      <QueryState isLoading={query.isLoading} isError={isQueryError(query.data)} isEmpty={false} />

      <MonthGrid
        year={year}
        month={month}
        tasksByDay={hasData ? tasksByDay : {}}
        onDayClick={(dateKey) => openQuickCapture(dateKey)}
        onTaskClick={(taskId) => navigate(`/tasks/${taskId}`)}
        onTaskDrop={handleTaskDrop}
        dropDisabled={updateTaskDueDate.isPending}
      />
    </div>
  );
}
