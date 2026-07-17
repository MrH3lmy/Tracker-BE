import { useState } from 'react';
import type { ApiCallResult } from '../../apiClient';
import type { HabitRecord } from '../habits/habitTypes';
import type { TaskRecord } from '../tasks/taskTypes';
import { matchesFocus, type Focus } from './schedulerStyleUtils';
import { SCHEDULE_PRIORITY_VALUES, type ScheduleHabitPayload, type ScheduleTaskPayload, type SchedulePriority, type SuggestedSlotRecord } from './schedulerTypes';
import { Badge, Button, Field, Input, Select } from '../ui';

type SuggestFn = (id: number) => Promise<ApiCallResult<SuggestedSlotRecord> | undefined>;

interface UnscheduledEntryListProps {
  tasks: TaskRecord[];
  habits: HabitRecord[];
  focus: Focus;
  date: string;
  busy: boolean;
  onScheduleTask: (taskId: number, payload: ScheduleTaskPayload) => void;
  onScheduleHabit: (habitId: number, payload: ScheduleHabitPayload) => void;
  onSuggestTask: SuggestFn;
  onSuggestHabit: SuggestFn;
}

export function UnscheduledEntryList({
  tasks, habits, focus, date, busy, onScheduleTask, onScheduleHabit, onSuggestTask, onSuggestHabit,
}: UnscheduledEntryListProps) {
  const visibleTasks = tasks.filter((task) => matchesFocus(task.area, focus));
  const visibleHabits = habits.filter((habit) => matchesFocus(habit.area, focus));

  if (visibleTasks.length === 0 && visibleHabits.length === 0) {
    return <p className="text-sm text-fg-subtle" role="status">Nothing left to schedule for this focus.</p>;
  }

  return (
    <ul className="flex flex-col gap-2" aria-label="Unscheduled tasks and habits">
      {visibleTasks.map((task) => (
        <UnscheduledRow
          key={`task-${task.id}`}
          kind="TASK"
          id={task.id}
          title={task.title}
          area={task.area}
          estimatedMinutes={task.estimatedMinutes}
          date={date}
          busy={busy}
          onSchedule={onScheduleTask}
          onSuggest={onSuggestTask}
        />
      ))}
      {visibleHabits.map((habit) => (
        <UnscheduledRow
          key={`habit-${habit.id}`}
          kind="HABIT"
          id={habit.id}
          title={habit.title}
          area={habit.area}
          estimatedMinutes={habit.estimatedMinutes}
          date={date}
          busy={busy}
          onSchedule={onScheduleHabit}
          onSuggest={onSuggestHabit}
        />
      ))}
    </ul>
  );
}

function UnscheduledRow({
  kind, id, title, area, estimatedMinutes, date, busy, onSchedule, onSuggest,
}: {
  kind: 'TASK' | 'HABIT';
  id: number;
  title: string;
  area?: string;
  estimatedMinutes?: number;
  date: string;
  busy: boolean;
  onSchedule: (id: number, payload: ScheduleTaskPayload) => void;
  onSuggest: SuggestFn;
}) {
  const [scheduledDate, setScheduledDate] = useState(date);
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(String(estimatedMinutes ?? 30));
  const [priorityLevel, setPriorityLevel] = useState<SchedulePriority>('MEDIUM');
  const [suggesting, setSuggesting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const submit = () => {
    if (!startTime) return;
    onSchedule(id, { scheduledDate, startTime, durationMinutes: Number(durationMinutes) || 30, priorityLevel });
  };

  const suggest = async () => {
    setSuggesting(true);
    const result = await onSuggest(id);
    setSuggesting(false);
    if (result?.ok && result.data) {
      setScheduledDate(result.data.scheduledDate);
      setStartTime(result.data.startTime.slice(0, 5));
      setDurationMinutes(String(result.data.durationMinutes));
      setNote(result.data.scheduledDate === date ? null : `Suggested for ${result.data.scheduledDate}`);
    } else {
      setNote('No free slot found in the next 30 days.');
    }
  };

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-line bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-fg">{title}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {kind === 'HABIT' && <Badge variant="outline">Habit</Badge>}
          {area && <Badge variant="outline">{area}</Badge>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Field label="Date" htmlFor={`schedule-date-${kind}-${id}`} className="min-w-[9rem] flex-1">
          <Input id={`schedule-date-${kind}-${id}`} type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} disabled={busy} />
        </Field>
        <Field label="Time" htmlFor={`schedule-time-${kind}-${id}`} className="min-w-[7.5rem] flex-1">
          <Input
            id={`schedule-time-${kind}-${id}`}
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={busy}
            className="pr-1 [&::-webkit-calendar-picker-indicator]:ml-1 [&::-webkit-calendar-picker-indicator]:shrink-0"
          />
        </Field>
        <Field label="Minutes" htmlFor={`schedule-duration-${kind}-${id}`} className="min-w-[5rem] flex-1">
          <Input id={`schedule-duration-${kind}-${id}`} type="number" min="5" step="5" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} disabled={busy} />
        </Field>
        <Field label="Priority" htmlFor={`schedule-priority-${kind}-${id}`} className="min-w-[7.5rem] flex-1">
          <Select id={`schedule-priority-${kind}-${id}`} value={priorityLevel} onChange={(e) => setPriorityLevel(e.target.value as SchedulePriority)} disabled={busy} className="pr-7">
            {SCHEDULE_PRIORITY_VALUES.map((level) => <option key={level} value={level}>{level}</option>)}
          </Select>
        </Field>
      </div>
      {note && <p className="text-xs text-fg-subtle" role="status">{note}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={busy || !startTime}>Schedule</Button>
        <Button size="sm" onClick={suggest} disabled={busy || suggesting}>{suggesting ? 'Suggesting...' : 'Suggest time'}</Button>
      </div>
    </li>
  );
}
