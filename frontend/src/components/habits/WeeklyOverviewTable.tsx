import { Link } from 'react-router-dom';
import { getWeekDates, inferHabitIcon, isCountBasedHabit, toDateKey } from './habitPresentation';
import type { HabitHistoryEntry, HabitRecord } from './habitTypes';
import { Badge, Card, CardHeader, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../ui';
import { Check, Circle } from '../ui/icons';

interface WeeklyOverviewTableProps {
  habits: HabitRecord[];
  historyEntries: HabitHistoryEntry[];
  isLoading: boolean;
}

const dayHeaderLabel = (date: Date) => new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' }).format(date);
const rangeLabel = (dates: Date[]) => {
  const monthDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  return `${monthDay.format(dates[0])} – ${monthDay.format(dates[6])}`;
};

export function WeeklyOverviewTable({ habits, historyEntries, isLoading }: WeeklyOverviewTableProps) {
  const weekDates = getWeekDates();
  const todayKey = toDateKey(new Date());
  const historyByHabit = new Map<number, Map<string, number>>();
  for (const entry of historyEntries) {
    if (!historyByHabit.has(entry.habitId)) historyByHabit.set(entry.habitId, new Map());
    historyByHabit.get(entry.habitId)!.set(entry.date, entry.count);
  }

  if (habits.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="This week overview"
        description={rangeLabel(weekDates)}
        actions={
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-fg-muted"><Check className="h-3.5 w-3.5 text-positive" aria-hidden /> Completed</span>
            <span className="flex items-center gap-1 text-xs text-fg-muted"><Circle className="h-3.5 w-3.5 text-fg-subtle" aria-hidden /> Missed</span>
          </div>
        }
      />
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Habit</TableHeaderCell>
            {weekDates.map((date) => {
              const isToday = toDateKey(date) === todayKey;
              return (
                <TableHeaderCell key={date.toISOString()} className={isToday ? 'text-brand' : undefined}>
                  {dayHeaderLabel(date)}
                </TableHeaderCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {habits.map((habit) => {
            const countBased = isCountBasedHabit(habit);
            const target = habit.dailyTargetCount ?? 1;
            const perDay = historyByHabit.get(habit.id);
            return (
              <TableRow key={habit.id}>
                <TableCell className="font-medium">
                  <span className="mr-1.5" aria-hidden>{inferHabitIcon(habit.title, habit.area)}</span>
                  {habit.title}
                </TableCell>
                {weekDates.map((date) => {
                  const dateKey = toDateKey(date);
                  const isToday = dateKey === todayKey;
                  const isFuture = date.getTime() > new Date().setHours(23, 59, 59, 999);
                  const count = perDay?.get(dateKey) ?? 0;
                  return (
                    <TableCell key={dateKey} className={isToday ? 'bg-brand-soft/40' : undefined}>
                      {isFuture ? (
                        <span className="text-fg-subtle">—</span>
                      ) : countBased ? (
                        <span className={count >= target ? 'font-medium text-positive' : 'text-fg-muted'}>{count}/{target}</span>
                      ) : count > 0 ? (
                        <Check className="h-4 w-4 text-positive" aria-hidden aria-label="Completed" />
                      ) : (
                        <Circle className="h-4 w-4 text-fg-subtle" aria-hidden aria-label="Missed" />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="mt-4 flex items-center justify-between gap-2">
        {isLoading && <Badge variant="outline">Loading history…</Badge>}
        <Link
          to="/habits/analysis"
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-card px-3.5 text-sm font-medium text-fg shadow-2xs hover:bg-inset"
        >
          View full history
        </Link>
      </div>
    </Card>
  );
}
