import { useState } from 'react';
import type { TaskRecord } from '../tasks/taskTypes';
import { matchesFocus, type Focus } from './schedulerStyleUtils';
import { SCHEDULE_PRIORITY_VALUES, type ScheduleTaskPayload, type SchedulePriority } from './schedulerTypes';
import { Badge, Button, Field, Input, Select } from '../ui';

interface UnscheduledTaskListProps {
  tasks: TaskRecord[];
  focus: Focus;
  date: string;
  busy: boolean;
  onSchedule: (taskId: number, payload: ScheduleTaskPayload) => void;
}

export function UnscheduledTaskList({ tasks, focus, date, busy, onSchedule }: UnscheduledTaskListProps) {
  const visible = tasks.filter((task) => matchesFocus(task.area, focus));

  if (visible.length === 0) {
    return <p className="text-sm text-fg-subtle" role="status">Nothing left to schedule for this focus.</p>;
  }

  return (
    <ul className="flex flex-col gap-2" aria-label="Unscheduled tasks">
      {visible.map((task) => (
        <UnscheduledTaskRow key={task.id} task={task} date={date} busy={busy} onSchedule={onSchedule} />
      ))}
    </ul>
  );
}

function UnscheduledTaskRow({ task, date, busy, onSchedule }: { task: TaskRecord; date: string; busy: boolean; onSchedule: UnscheduledTaskListProps['onSchedule'] }) {
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(String(task.estimatedMinutes ?? 30));
  const [priorityLevel, setPriorityLevel] = useState<SchedulePriority>('MEDIUM');

  const submit = () => {
    if (!startTime) return;
    onSchedule(task.id, {
      scheduledDate: date,
      startTime,
      durationMinutes: Number(durationMinutes) || 30,
      priorityLevel,
    });
  };

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-line bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-fg">{task.title}</span>
        {task.area && <Badge variant="outline">{task.area}</Badge>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Time" htmlFor={`schedule-time-${task.id}`}>
          <Input id={`schedule-time-${task.id}`} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={busy} />
        </Field>
        <Field label="Minutes" htmlFor={`schedule-duration-${task.id}`}>
          <Input id={`schedule-duration-${task.id}`} type="number" min="5" step="5" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} disabled={busy} />
        </Field>
        <Field label="Priority" htmlFor={`schedule-priority-${task.id}`}>
          <Select id={`schedule-priority-${task.id}`} value={priorityLevel} onChange={(e) => setPriorityLevel(e.target.value as SchedulePriority)} disabled={busy}>
            {SCHEDULE_PRIORITY_VALUES.map((level) => <option key={level} value={level}>{level}</option>)}
          </Select>
        </Field>
      </div>
      <Button size="sm" onClick={submit} disabled={busy || !startTime}>Schedule</Button>
    </li>
  );
}
