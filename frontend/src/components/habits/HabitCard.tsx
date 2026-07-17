import { formatReminderTime, getWeekDates, inferHabitIcon, inferHabitUnit, isCountBasedHabit, toDateKey, HABIT_CATEGORY_LABELS, WEEKDAY_SHORT_LABELS } from './habitPresentation';
import type { HabitRecord } from './habitTypes';
import { Badge, Button, Card, Menu, MenuContent, MenuItem, MenuTrigger, cn } from '../ui';
import { Check, Clock, MoreHorizontal, Pencil, Trash2 } from '../ui/icons';

const MAX_VISIBLE_PIPS = 12;

interface HabitCardProps {
  habit: HabitRecord;
  busy: boolean;
  weekHistory?: Map<string, number>;
  onCheckIn: (id: number) => void;
  onUndoCheckIn: (id: number) => void;
  onEdit: (habit: HabitRecord) => void;
  onDeleteRequest: (habit: HabitRecord) => void;
}

export function HabitCard({ habit, busy, weekHistory, onCheckIn, onUndoCheckIn, onEdit, onDeleteRequest }: HabitCardProps) {
  const target = habit.dailyTargetCount ?? 1;
  const todayCount = habit.todayCheckInCount ?? 0;
  const streak = habit.recurrence?.currentStreak ?? 0;
  const targetMet = habit.todayTargetMet ?? todayCount >= target;
  const countBased = isCountBasedHabit(habit);
  const icon = inferHabitIcon(habit.title, habit.area);
  const reminderLabel = habit.reminderEnabled ? formatReminderTime(habit.reminderTime) : undefined;
  const categoryLabel = habit.area && habit.area in HABIT_CATEGORY_LABELS ? HABIT_CATEGORY_LABELS[habit.area as keyof typeof HABIT_CATEGORY_LABELS] : habit.area;

  return (
    <Card className="flex flex-col gap-3.5" aria-label={`Habit ${habit.title}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xl" aria-hidden>{icon}</span>
          <div className="min-w-0 pt-0.5">
            <p className="truncate text-sm font-semibold text-fg">{habit.title}</p>
            {habit.description && <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{habit.description}</p>}
          </div>
        </div>
        <Menu>
          <MenuTrigger asChild>
            <Button variant="ghost" size="sm" iconOnly aria-label={`More actions for ${habit.title}`}>
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          </MenuTrigger>
          <MenuContent>
            <MenuItem onSelect={() => onEdit(habit)}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </MenuItem>
            <MenuItem destructive onSelect={() => onDeleteRequest(habit)}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Delete
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {categoryLabel && <Badge variant="positive">{categoryLabel.toUpperCase()}</Badge>}
        {reminderLabel && (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" aria-hidden />
            {reminderLabel}
          </Badge>
        )}
        {habit.important && <Badge variant="caution">Important</Badge>}
      </div>

      {countBased ? (
        <CountProgress habit={habit} target={target} todayCount={todayCount} targetMet={targetMet} busy={busy} onCheckIn={onCheckIn} onUndoCheckIn={onUndoCheckIn} />
      ) : (
        <CompleteOnceProgress habit={habit} targetMet={targetMet} todayCount={todayCount} busy={busy} weekHistory={weekHistory} onCheckIn={onCheckIn} onUndoCheckIn={onUndoCheckIn} />
      )}

      {streak > 0 && <p className="text-xs font-medium text-caution">🔥 {streak}-day streak</p>}
    </Card>
  );
}

function CountProgress({ habit, target, todayCount, targetMet, busy, onCheckIn, onUndoCheckIn }: {
  habit: HabitRecord; target: number; todayCount: number; targetMet: boolean; busy: boolean;
  onCheckIn: (id: number) => void; onUndoCheckIn: (id: number) => void;
}) {
  const unit = inferHabitUnit(habit.title);
  const visiblePips = Math.min(target, MAX_VISIBLE_PIPS);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-xs text-fg-muted">
        <span>Today</span>
        <span className={cn('font-medium', targetMet ? 'text-brand' : 'text-fg')}>{todayCount} / {target}</span>
      </div>
      <div className="flex flex-wrap gap-1.5" role="img" aria-label={`${todayCount} of ${target} ${unit.label.toLowerCase()} logged today`}>
        {Array.from({ length: visiblePips }, (_, index) => (
          <span
            key={index}
            aria-hidden
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md border text-xs',
              index < todayCount ? 'border-brand bg-brand text-brand-fg' : 'border-line bg-inset text-fg-subtle',
            )}
          >
            {index < todayCount ? <Check className="h-3.5 w-3.5" aria-hidden /> : ''}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => onCheckIn(habit.id)} disabled={busy || targetMet} className="flex-1">
          {targetMet ? 'Target reached' : `Add ${unit.singular}`}
        </Button>
        <Button onClick={() => onUndoCheckIn(habit.id)} disabled={busy || todayCount === 0}>
          Undo
        </Button>
      </div>
    </div>
  );
}

function CompleteOnceProgress({ habit, targetMet, todayCount, busy, weekHistory, onCheckIn, onUndoCheckIn }: {
  habit: HabitRecord; targetMet: boolean; todayCount: number; busy: boolean; weekHistory?: Map<string, number>;
  onCheckIn: (id: number) => void; onUndoCheckIn: (id: number) => void;
}) {
  const weekDates = getWeekDates();
  const todayKey = toDateKey(new Date());

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-xs text-fg-muted">
        <span>This week</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {weekDates.map((date, index) => {
          const dateKey = toDateKey(date);
          const completed = (weekHistory?.get(dateKey) ?? 0) > 0;
          const isToday = dateKey === todayKey;
          return (
            <div key={dateKey} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-fg-subtle">{WEEKDAY_SHORT_LABELS[index]}</span>
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border-2',
                  completed ? 'border-positive bg-positive-soft text-positive' : 'border-line text-fg-subtle',
                  isToday && 'ring-2 ring-brand ring-offset-1 ring-offset-card',
                )}
                aria-label={`${WEEKDAY_SHORT_LABELS[index]}: ${completed ? 'completed' : 'not completed'}${isToday ? ' (today)' : ''}`}
              >
                {completed ? <Check className="h-3.5 w-3.5" aria-hidden /> : <span aria-hidden>·</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        {targetMet ? (
          <span className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-positive bg-positive-soft px-3.5 py-2 text-sm font-medium text-positive">
            <Check className="h-4 w-4" aria-hidden />
            Completed
          </span>
        ) : (
          <Button variant="primary" onClick={() => onCheckIn(habit.id)} disabled={busy} className="flex-1">
            Mark complete
          </Button>
        )}
        <Button onClick={() => onUndoCheckIn(habit.id)} disabled={busy || todayCount === 0}>
          Undo
        </Button>
      </div>
    </div>
  );
}
