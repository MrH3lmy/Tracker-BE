import type { HabitRecord } from './habitTypes';
import { Badge, Button, Card, cn } from '../ui';

interface HabitCardProps {
  habit: HabitRecord;
  busy: boolean;
  onCheckIn: (id: number) => void;
  onUndoCheckIn: (id: number) => void;
  onEdit: (habit: HabitRecord) => void;
  onDelete: (id: number) => void;
}

const formatReminderTime = (value?: string) => {
  if (!value) return undefined;
  const [hourStr, minuteStr] = value.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
};

export function HabitCard({ habit, busy, onCheckIn, onUndoCheckIn, onEdit, onDelete }: HabitCardProps) {
  const target = habit.dailyTargetCount ?? 1;
  const todayCount = habit.todayCheckInCount ?? 0;
  const streak = habit.recurrence?.currentStreak ?? 0;
  const targetMet = habit.todayTargetMet ?? todayCount >= target;
  const progressPct = Math.min(100, Math.round((todayCount / Math.max(target, 1)) * 100));

  return (
    <Card className="flex flex-col gap-3" aria-label={`Habit ${habit.title}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">{habit.title}</p>
          {habit.description && <p className="mt-0.5 truncate text-xs text-fg-muted">{habit.description}</p>}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="sm" onClick={() => onEdit(habit)} disabled={busy}>Edit</Button>
          <Button size="sm" onClick={() => onDelete(habit.id)} disabled={busy}>Delete</Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {habit.area && <Badge variant="outline">{habit.area}</Badge>}
        {habit.important && <Badge variant="caution">Important</Badge>}
        {habit.recurrence && <Badge variant="outline">{habit.recurrence.frequency}</Badge>}
        {habit.reminderEnabled && habit.reminderTime && (
          <Badge variant="outline">⏰ {formatReminderTime(habit.reminderTime)}</Badge>
        )}
        {streak > 0 && <Badge variant="caution">🔥 {streak}</Badge>}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs text-fg-muted">
          <span>Today</span>
          <span className={targetMet ? 'font-medium text-brand' : undefined}>{todayCount}/{target}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-soft" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={cn('h-full rounded-full transition-[width] duration-(--duration-base)', targetMet ? 'bg-brand' : 'bg-fg-subtle')}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={() => onCheckIn(habit.id)} disabled={busy || targetMet}>
          Check in
        </Button>
        <Button size="sm" onClick={() => onUndoCheckIn(habit.id)} disabled={busy || todayCount === 0}>
          Undo
        </Button>
      </div>
    </Card>
  );
}
