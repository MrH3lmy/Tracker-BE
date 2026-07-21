import { useMemo } from 'react';
import { Badge, cn } from '../ui';
import { addDaysToDateOnlyKey, formatDateOnly, todayDateOnlyKey, toDateOnlyKey } from '../../lib/dateOnly';

export interface MonthGridTask {
  id?: number;
  title?: string;
  important?: boolean;
  status?: string;
}

interface MonthGridProps {
  year: number;
  /** 1-12 */
  month: number;
  tasksByDay: Record<string, MonthGridTask[]>;
  onDayClick: (dateKey: string) => void;
  onTaskClick: (taskId: number) => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_TASKS = 3;

const monthPrefix = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

export function MonthGrid({ year, month, tasksByDay, onDayClick, onTaskClick }: MonthGridProps) {
  const todayKey = todayDateOnlyKey();
  const prefix = monthPrefix(year, month);

  const cells = useMemo(() => {
    const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const firstWeekday = firstOfMonth.getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const startKey = toDateOnlyKey(new Date(Date.UTC(year, month - 1, 1 - firstWeekday)));
    return Array.from({ length: totalCells }, (_, index) => {
      const dateKey = addDaysToDateOnlyKey(startKey, index);
      return { dateKey, inMonth: dateKey.startsWith(prefix) };
    });
  }, [year, month, prefix]);

  return (
    <div className="overflow-hidden rounded-xl border border-line" role="grid" aria-label={`${formatDateOnly(`${prefix}-01`)} month grid`}>
      <div className="grid grid-cols-7 border-b border-line" role="row">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} role="columnheader" className="border-r border-line bg-inset/40 px-2 py-1.5 text-center text-xs font-semibold text-fg-subtle last:border-r-0">{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map(({ dateKey, inMonth }, index) => {
          const dayTasks = tasksByDay[dateKey] ?? [];
          const visibleTasks = dayTasks.slice(0, MAX_VISIBLE_TASKS);
          const overflowCount = dayTasks.length - visibleTasks.length;
          const isToday = dateKey === todayKey;
          const dayNumber = Number(dateKey.slice(8, 10));
          const hasOverdue = dateKey < todayKey && dayTasks.some((task) => task.status !== 'DONE' && task.status !== 'CANCELLED');
          const hasImportant = dayTasks.some((task) => task.important);

          return (
            <div
              key={dateKey}
              role="gridcell"
              className={cn(
                'flex min-h-24 flex-col gap-1 border-r border-b border-line bg-card p-1.5 [&:nth-child(7n)]:border-r-0',
                !inMonth && 'bg-inset/30',
                index >= cells.length - 7 && 'border-b-0',
              )}
            >
              <button
                type="button"
                onClick={() => onDayClick(dateKey)}
                className="flex items-center gap-1 rounded text-left hover:opacity-80"
                aria-label={`Add a task on ${formatDateOnly(dateKey)}`}
              >
                <span className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                  isToday ? 'bg-brand text-brand-fg' : inMonth ? 'text-fg' : 'text-fg-subtle',
                )}>
                  {dayNumber}
                </span>
                {hasOverdue && <Badge variant="critical" className="ml-auto px-1 py-0 text-[10px]">Overdue</Badge>}
                {!hasOverdue && hasImportant && <Badge variant="caution" className="ml-auto px-1 py-0 text-[10px]">Important</Badge>}
              </button>
              <div className="flex flex-col gap-0.5">
                {visibleTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => task.id !== undefined && onTaskClick(task.id)}
                    className="truncate rounded bg-inset px-1 py-0.5 text-left text-[11px] text-fg hover:bg-brand-soft hover:text-brand"
                  >
                    {task.title ?? 'Untitled'}
                  </button>
                ))}
                {overflowCount > 0 && <span className="px-1 text-[11px] text-fg-subtle">+{overflowCount} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
