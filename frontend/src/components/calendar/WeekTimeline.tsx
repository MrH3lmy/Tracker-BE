import { DndContext, PointerSensor, closestCenter, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useNavigate } from 'react-router-dom';
import { formatDateOnly, todayDateOnlyKey } from '../../lib/dateOnly';
import type { SchedulePriority } from '../scheduler/schedulerTypes';
import { Badge, cn } from '../ui';
import { Flame, ListTodo } from '../ui/icons';

export interface WeekEntry {
  kind: 'TASK' | 'HABIT';
  id: number;
  taskId?: number;
  title: string;
  startTime: string;
  durationMinutes: number;
  priorityLevel?: SchedulePriority;
}

export interface WeekDay {
  dateKey: string;
  entries: WeekEntry[];
}

interface WeekTimelineProps {
  days: WeekDay[];
  busy: boolean;
  onReschedule: (entry: WeekEntry, newDateKey: string) => void;
}

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' });
const shortDayFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

function formatTime(value: string): string {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function EntryChip({ entry, disabled }: { entry: WeekEntry; disabled: boolean }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `${entry.kind}-${entry.id}`, data: { entry }, disabled });
  const Icon = entry.kind === 'HABIT' ? Flame : ListTodo;

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => { if (entry.kind === 'TASK' && entry.taskId !== undefined) navigate(`/tasks/${entry.taskId}`); }}
      className={cn(
        'flex w-full cursor-grab items-center gap-1.5 rounded-md border border-line bg-inset/40 px-2 py-1.5 text-left text-xs transition-shadow active:cursor-grabbing',
        isDragging && 'z-10 opacity-60 shadow-(--shadow-glow-brand-lg)',
      )}
      aria-roledescription="draggable scheduled item"
    >
      <Icon className="h-3 w-3 shrink-0 text-brand" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-medium text-fg">{entry.title}</span>
      <span className="shrink-0 text-[10px] text-fg-subtle tabular-nums">{formatTime(entry.startTime)}</span>
    </button>
  );
}

function DayColumn({ day, busy }: { day: WeekDay; busy: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: day.dateKey });
  const isToday = day.dateKey === todayDateOnlyKey();
  const sorted = [...day.entries].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const [, month, dayOfMonth] = day.dateKey.split('-');
  const displayDate = new Date(Date.UTC(Number(day.dateKey.slice(0, 4)), Number(month) - 1, Number(dayOfMonth)));

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-40 flex-1 flex-col gap-1.5 rounded-lg border border-line bg-card p-2 transition-colors duration-(--duration-fast)',
        isOver && 'bg-brand-soft ring-2 ring-brand',
      )}
    >
      <div className="flex items-baseline justify-between gap-1 border-b border-line pb-1.5">
        <span className="text-xs font-semibold text-fg-subtle">{weekdayFormatter.format(displayDate)}</span>
        <span className={cn('rounded-full px-1.5 text-xs font-semibold tabular-nums', isToday && 'bg-brand text-brand-fg')}>
          {shortDayFormatter.format(displayDate)}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {sorted.length === 0 ? (
          <p className="py-4 text-center text-[11px] text-fg-subtle" role="status">Nothing scheduled</p>
        ) : (
          sorted.map((entry) => <EntryChip key={`${entry.kind}-${entry.id}`} entry={entry} disabled={busy} />)
        )}
      </div>
    </div>
  );
}

export function WeekTimeline({ days, busy, onReschedule }: WeekTimelineProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const entry = active.data.current?.entry as WeekEntry | undefined;
    if (!entry) return;
    const targetDateKey = String(over.id);
    const currentDay = days.find((day) => day.entries.some((candidate) => candidate.kind === entry.kind && candidate.id === entry.id));
    if (currentDay?.dateKey === targetDateKey) return;
    onReschedule(entry, targetDateKey);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7" role="list" aria-label="Week schedule">
        {days.map((day) => <DayColumn key={day.dateKey} day={day} busy={busy} />)}
      </div>
      <p className="mt-2 text-xs text-fg-subtle">Drag a scheduled item onto another day to reschedule it. <Badge variant="outline">{formatDateOnly(days[0]?.dateKey)}</Badge> through <Badge variant="outline">{formatDateOnly(days[days.length - 1]?.dateKey)}</Badge></p>
    </DndContext>
  );
}
