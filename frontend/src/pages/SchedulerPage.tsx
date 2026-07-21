import { useMemo, useState } from 'react';
import { isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { SchedulerTimeline } from '../components/scheduler/SchedulerTimeline';
import { UnscheduledEntryList } from '../components/scheduler/UnscheduledEntryList';
import type { Focus } from '../components/scheduler/schedulerStyleUtils';
import type { AutoScheduleResultRecord, DayScheduleRecord } from '../components/scheduler/schedulerTypes';
import { useHabitMutations, useSchedulerDayQuery, useSchedulerMutations, useTaskMutations } from '../hooks/useApiQueries';
import { Button, Card, PageHeader, SegmentedControl } from '../components/ui';
import { useUndoToast } from '../undoToastContext';

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

const autoScheduleSummary = (result: AutoScheduleResultRecord) => {
  const scheduled = result.scheduledTaskIds.length + result.scheduledHabitIds.length;
  const unresolved = result.unresolvedTaskIds.length + result.unresolvedHabitIds.length;
  if (scheduled === 0 && unresolved === 0) return 'Nothing to auto-schedule - everything is already booked.';
  return `Auto-scheduled ${scheduled} item${scheduled === 1 ? '' : 's'}.${unresolved > 0 ? ` ${unresolved} item${unresolved === 1 ? '' : 's'} had no free slot in range.` : ''}`;
};

export function SchedulerPage() {
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const [focus, setFocus] = useState<Focus>('all');
  const [autoScheduleMessage, setAutoScheduleMessage] = useState<string | null>(null);

  const dayQuery = useSchedulerDayQuery(date);
  const { scheduleTask, unscheduleTask, scheduleHabit, unscheduleHabit, suggestForTask, suggestForHabit, autoSchedule } = useSchedulerMutations();
  const { completeTask } = useTaskMutations();
  const { checkIn } = useHabitMutations();
  const { showUndo } = useUndoToast();

  const day = useMemo<DayScheduleRecord | undefined>(() => {
    const data = dayQuery.data?.data;
    return data && typeof data === 'object' ? (data as DayScheduleRecord) : undefined;
  }, [dayQuery.data]);

  const isLoading = dayQuery.isLoading;
  const hasError = isQueryError(dayQuery.data);
  const busy = scheduleTask.isPending || unscheduleTask.isPending || scheduleHabit.isPending || unscheduleHabit.isPending
    || completeTask.isPending || checkIn.isPending || autoSchedule.isPending;

  const handleUnscheduleTask = (taskId: number) => {
    const entry = day?.scheduled.find((candidate) => candidate.kind === 'TASK' && candidate.id === taskId);
    unscheduleTask.mutate(taskId, {
      onSuccess: (result) => {
        if (!result.ok || !entry) return;
        showUndo(`"${entry.task?.title ?? 'Task'}" removed from schedule.`, () => scheduleTask.mutate({
          taskId,
          body: { scheduledDate: entry.scheduledDate, startTime: entry.startTime, durationMinutes: entry.durationMinutes, priorityLevel: entry.priorityLevel },
        }));
      },
    });
  };

  const handleUnscheduleHabit = (habitId: number) => {
    const entry = day?.scheduled.find((candidate) => candidate.kind === 'HABIT' && candidate.id === habitId);
    unscheduleHabit.mutate(habitId, {
      onSuccess: (result) => {
        if (!result.ok || !entry) return;
        showUndo(`"${entry.habit?.title ?? 'Habit'}" removed from schedule.`, () => scheduleHabit.mutate({
          habitId,
          body: { scheduledDate: entry.scheduledDate, startTime: entry.startTime, durationMinutes: entry.durationMinutes, priorityLevel: entry.priorityLevel },
        }));
      },
    });
  };

  const runAutoSchedule = () => {
    setAutoScheduleMessage(null);
    autoSchedule.mutate({ startDate: date, endDate: shiftDate(date, 6), scope: 'ALL' }, {
      onSuccess: (result) => {
        if (result.ok && result.data) setAutoScheduleMessage(autoScheduleSummary(result.data as AutoScheduleResultRecord));
      },
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Scheduler"
        description="Give tasks and habits a specific time and priority today, separate from whole-day planning."
        className="mb-0"
        actions={
          <div className="flex items-center gap-2">
            <SegmentedControl value={focus} onValueChange={setFocus} options={focusOptions} aria-label="Focus filter" />
            <Button size="sm" onClick={runAutoSchedule} disabled={busy}>
              {autoSchedule.isPending ? 'Auto-scheduling...' : 'Auto-schedule week'}
            </Button>
          </div>
        }
      />

      {autoScheduleMessage && <p className="text-sm text-fg-muted" role="status">{autoScheduleMessage}</p>}

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
            onCheckIn={(habitId) => checkIn.mutate(habitId)}
            onUnscheduleTask={handleUnscheduleTask}
            onUnscheduleHabit={handleUnscheduleHabit}
          />
          <Card className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-fg">Unscheduled</h3>
            <UnscheduledEntryList
              tasks={day.unscheduledTasks}
              habits={day.unscheduledHabits}
              focus={focus}
              date={date}
              busy={busy}
              onScheduleTask={(taskId, body) => scheduleTask.mutate({ taskId, body })}
              onScheduleHabit={(habitId, body) => scheduleHabit.mutate({ habitId, body })}
              onSuggestTask={(taskId) => suggestForTask.mutateAsync(taskId)}
              onSuggestHabit={(habitId) => suggestForHabit.mutateAsync(habitId)}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
