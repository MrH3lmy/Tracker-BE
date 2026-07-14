import { useMemo, useState } from 'react';
import { isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { SchedulerTimeline } from '../components/scheduler/SchedulerTimeline';
import { UnscheduledTaskList } from '../components/scheduler/UnscheduledTaskList';
import type { Focus } from '../components/scheduler/schedulerStyleUtils';
import type { DayScheduleRecord } from '../components/scheduler/schedulerTypes';
import { useSchedulerDayQuery, useSchedulerMutations, useTaskMutations } from '../hooks/useApiQueries';
import { Button, Card, PageHeader, SegmentedControl } from '../components/ui';

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shiftDate = (isoDate: string, days: number) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

const formatDayLabel = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const focusOptions = [
  { value: 'all' as Focus, label: 'All' },
  { value: 'work' as Focus, label: 'Work' },
  { value: 'training' as Focus, label: 'Training & Life' },
];

export function SchedulerPage() {
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const [focus, setFocus] = useState<Focus>('all');

  const dayQuery = useSchedulerDayQuery(date);
  const { scheduleTask, unscheduleTask } = useSchedulerMutations();
  const { completeTask, checkIn } = useTaskMutations();

  const day = useMemo<DayScheduleRecord | undefined>(() => {
    const data = dayQuery.data?.data;
    return data && typeof data === 'object' ? (data as DayScheduleRecord) : undefined;
  }, [dayQuery.data]);

  const isLoading = dayQuery.isLoading;
  const hasError = isQueryError(dayQuery.data);
  const busy = scheduleTask.isPending || unscheduleTask.isPending || completeTask.isPending || checkIn.isPending;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Scheduler"
        description="Give tasks a specific time and priority today, separate from whole-day planning."
        className="mb-0"
        actions={
          <SegmentedControl value={focus} onValueChange={setFocus} options={focusOptions} aria-label="Focus filter" />
        }
      />

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setDate((current) => shiftDate(current, -1))} disabled={busy}>Previous day</Button>
        <Button size="sm" onClick={() => setDate(toIsoDate(new Date()))} disabled={busy}>Today</Button>
        <Button size="sm" onClick={() => setDate((current) => shiftDate(current, 1))} disabled={busy}>Next day</Button>
        <span className="text-sm font-medium text-fg">{formatDayLabel(date)}</span>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={hasError}
        isEmpty={!isLoading && !hasError && !day}
        emptyMessage="Could not load the schedule for this day."
      />

      {day && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
          <SchedulerTimeline
            scheduled={day.scheduled}
            focus={focus}
            busy={busy}
            onComplete={(taskId) => completeTask.mutate(taskId)}
            onCheckIn={(taskId) => checkIn.mutate(taskId)}
            onUnschedule={(taskId) => unscheduleTask.mutate(taskId)}
          />
          <Card className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-fg">Unscheduled</h3>
            <UnscheduledTaskList
              tasks={day.unscheduled}
              focus={focus}
              date={date}
              busy={busy}
              onSchedule={(taskId, body) => scheduleTask.mutate({ taskId, body })}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
