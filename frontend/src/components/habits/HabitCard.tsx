import type { HabitRecord } from './habitTypes';
import { Badge, Button, Card } from '../ui';

interface HabitCardProps {
  habit: HabitRecord;
  busy: boolean;
  onCheckIn: (id: number) => void;
  onUndoCheckIn: (id: number) => void;
  onEdit: (habit: HabitRecord) => void;
  onDelete: (id: number) => void;
}

export function HabitCard({ habit, busy, onCheckIn, onUndoCheckIn, onEdit, onDelete }: HabitCardProps) {
  const target = habit.dailyTargetCount ?? 1;
  const todayCount = habit.todayCheckInCount ?? 0;
  const streak = habit.recurrence?.currentStreak ?? 0;
  const targetMet = habit.todayTargetMet ?? todayCount >= target;

  return (
    <Card className="flex flex-col gap-2" aria-label={`Habit ${habit.title}`}>
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
        {streak > 0 && <Badge variant="caution">🔥 {streak}</Badge>}
        <Badge variant={targetMet ? 'brand' : 'outline'}>{todayCount}/{target} today</Badge>
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
