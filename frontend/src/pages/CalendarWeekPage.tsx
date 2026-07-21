import { useMemo, useState } from 'react';
import { isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { SectionTabs } from '../components/SectionTabs';
import { CALENDAR_VIEW_TABS } from '../router/routes';
import { WeekTimeline, type WeekDay, type WeekEntry } from '../components/calendar/WeekTimeline';
import { addDaysToDateOnlyKey, formatDateOnly, todayDateOnlyKey } from '../lib/dateOnly';
import { SCHEDULE_PRIORITY_VALUES, type SchedulePriority } from '../components/scheduler/schedulerTypes';
import { useSchedulerMutations, useSchedulerWeekQuery } from '../hooks/useApiQueries';
import { useUndoToast } from '../undoToastContext';
import { Button, PageHeader } from '../components/ui';

// Weeks start on the Sunday on/before "today" so the grid always shows a full Sun-Sat range.
function startOfWeek(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return addDaysToDateOnlyKey(dateKey, -date.getUTCDay());
}

interface RawScheduledEntry {
  kind?: 'TASK' | 'HABIT';
  id?: number;
  task?: { id?: number; title?: string };
  habit?: { id?: number; title?: string };
  startTime?: string;
  durationMinutes?: number;
  priorityLevel?: string;
}

interface RawWeekResponse {
  startDate?: string;
  days?: { date?: string; scheduled?: RawScheduledEntry[] }[];
}

const asSchedulePriority = (value?: string): SchedulePriority | undefined =>
  (SCHEDULE_PRIORITY_VALUES as readonly string[]).includes(value ?? '') ? (value as SchedulePriority) : undefined;

export function CalendarWeekPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayDateOnlyKey()));
  const { showUndo } = useUndoToast();
  const query = useSchedulerWeekQuery(weekStart);
  const { scheduleTask, scheduleHabit } = useSchedulerMutations();
  const busy = scheduleTask.isPending || scheduleHabit.isPending;

  const weekDays = useMemo<WeekDay[]>(() => {
    const data = query.data?.data as RawWeekResponse | undefined;
    if (!data?.days) return [];
    return data.days.map((day) => ({
      dateKey: day.date ?? '',
      entries: (day.scheduled ?? []).map((entry): WeekEntry => ({
        kind: entry.kind === 'HABIT' ? 'HABIT' : 'TASK',
        id: entry.id ?? 0,
        taskId: entry.task?.id,
        title: entry.task?.title ?? entry.habit?.title ?? 'Untitled',
        startTime: entry.startTime ?? '00:00',
        durationMinutes: entry.durationMinutes ?? 30,
        priorityLevel: asSchedulePriority(entry.priorityLevel),
      })),
    }));
  }, [query.data]);

  const handleReschedule = (entry: WeekEntry, newDateKey: string) => {
    const previousDay = weekDays.find((day) => day.entries.some((candidate) => candidate.kind === entry.kind && candidate.id === entry.id));
    const previousDateKey = previousDay?.dateKey;
    const body = { scheduledDate: newDateKey, startTime: entry.startTime, durationMinutes: entry.durationMinutes, priorityLevel: entry.priorityLevel };
    const undoBody = previousDateKey ? { ...body, scheduledDate: previousDateKey } : undefined;

    if (entry.kind === 'TASK') {
      scheduleTask.mutate({ taskId: entry.id, body }, {
        onSuccess: (result) => {
          if (!result.ok || !undoBody) return;
          showUndo(`"${entry.title}" moved to ${formatDateOnly(newDateKey)}.`, () => scheduleTask.mutate({ taskId: entry.id, body: undoBody }));
        },
      });
    } else {
      scheduleHabit.mutate({ habitId: entry.id, body }, {
        onSuccess: (result) => {
          if (!result.ok || !undoBody) return;
          showUndo(`"${entry.title}" moved to ${formatDateOnly(newDateKey)}.`, () => scheduleHabit.mutate({ habitId: entry.id, body: undoBody }));
        },
      });
    }
  };

  const weekEnd = addDaysToDateOnlyKey(weekStart, 6);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTabs items={CALENDAR_VIEW_TABS} ariaLabel="Calendar view" />
      </div>
      <PageHeader
        title="Week"
        description={`${formatDateOnly(weekStart)} - ${formatDateOnly(weekEnd)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setWeekStart((current) => addDaysToDateOnlyKey(current, -7))}>Previous</Button>
            <Button size="sm" onClick={() => setWeekStart(startOfWeek(todayDateOnlyKey()))}>Today</Button>
            <Button size="sm" onClick={() => setWeekStart((current) => addDaysToDateOnlyKey(current, 7))}>Next</Button>
          </div>
        }
        className="mb-0"
      />

      <QueryState isLoading={query.isLoading} isError={isQueryError(query.data)} isEmpty={!query.isLoading && weekDays.length === 0} emptyMessage="Could not load this week's schedule." />

      {weekDays.length > 0 && <WeekTimeline days={weekDays} busy={busy} onReschedule={handleReschedule} />}
    </div>
  );
}
