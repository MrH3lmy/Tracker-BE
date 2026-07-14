import type { ScheduledTaskRecord } from './schedulerTypes';
import { matchesFocus, schedulePriorityVariant, type Focus } from './schedulerStyleUtils';
import { Badge, Button, cn } from '../ui';
import { Clock } from '../ui/icons';

const VISIBLE_START_HOUR = 5;
const VISIBLE_END_HOUR = 23;
const HOUR_HEIGHT = 64;
const PIXELS_PER_MINUTE = HOUR_HEIGHT / 60;
const VISIBLE_START_MINUTES = VISIBLE_START_HOUR * 60;
const TIMELINE_MAX_HEIGHT_CLASS = 'max-h-[36rem]';

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

interface SchedulerTimelineProps {
  scheduled: ScheduledTaskRecord[];
  focus: Focus;
  busy: boolean;
  onComplete: (taskId: number) => void;
  onCheckIn: (taskId: number) => void;
  onUnschedule: (taskId: number) => void;
}

export function SchedulerTimeline({ scheduled, focus, busy, onComplete, onCheckIn, onUnschedule }: SchedulerTimelineProps) {
  const hours = Array.from({ length: VISIBLE_END_HOUR - VISIBLE_START_HOUR + 1 }, (_, index) => VISIBLE_START_HOUR + index);
  const totalHeight = (VISIBLE_END_HOUR - VISIBLE_START_HOUR) * HOUR_HEIGHT;

  const focusFiltered = scheduled.filter((entry) => matchesFocus(entry.task.area, focus));
  // Events that end before the visible window starts would otherwise render
  // with a negative top offset and escape the timeline container, so they're
  // surfaced in a separate "earlier events" indicator instead.
  const earlier = focusFiltered.filter((entry) => timeToMinutes(entry.endTime) <= VISIBLE_START_MINUTES);
  const visible = focusFiltered.filter((entry) => timeToMinutes(entry.endTime) > VISIBLE_START_MINUTES);

  return (
    <div className="flex flex-col gap-2">
      {earlier.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-line bg-inset/40 px-3 py-2 text-xs text-fg-muted"
          role="status"
          aria-label="Events earlier than the visible timeline"
        >
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-medium text-fg">Earlier today:</span>
          <span>
            {earlier
              .map((entry) => `${entry.task.title} (${entry.startTime.slice(0, 5)}–${entry.endTime.slice(0, 5)})`)
              .join(', ')}
          </span>
        </div>
      )}

      <div className={cn('flex gap-2 overflow-y-auto', TIMELINE_MAX_HEIGHT_CLASS)} aria-label="Day timeline">
        <div className="flex flex-col text-right text-xs text-fg-subtle" style={{ height: totalHeight }}>
          {hours.map((hour) => (
            <div key={hour} className="shrink-0 pr-2" style={{ height: HOUR_HEIGHT }}>
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        <div
          className="relative flex-1 overflow-hidden rounded-lg border border-line bg-inset/20"
          style={{ height: totalHeight }}
        >
          {hours.map((hour, index) => (
            <div key={hour} className="absolute inset-x-0 border-t border-line/60" style={{ top: index * HOUR_HEIGHT }} />
          ))}
          {visible.length === 0 && earlier.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-fg-subtle" role="status">
              Nothing scheduled for this day yet.
            </p>
          )}
          {visible.map((entry) => {
            const startMinutes = timeToMinutes(entry.startTime);
            const top = (startMinutes - VISIBLE_START_MINUTES) * PIXELS_PER_MINUTE;
            const height = Math.max(entry.durationMinutes * PIXELS_PER_MINUTE, 32);
            const hasOverlap = entry.overlapsWithTaskIds.length > 0;
            const targetCount = entry.task.dailyTargetCount ?? 1;
            const isCounterHabit = targetCount > 1;
            const streak = entry.task.recurrence?.currentStreak ?? 0;
            return (
              <article
                key={entry.taskId}
                className={cn(
                  'absolute right-2 left-2 flex flex-col gap-1 overflow-hidden rounded-lg border bg-card p-2 shadow-2xs',
                  hasOverlap ? 'border-critical' : 'border-line',
                )}
                style={{ top, height }}
                aria-label={`${entry.task.title}, ${entry.startTime.slice(0, 5)} to ${entry.endTime.slice(0, 5)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-fg">{entry.task.title}</span>
                  <Badge variant={schedulePriorityVariant(entry.priorityLevel)}>{entry.priorityLevel}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
                  <span>{entry.startTime.slice(0, 5)}–{entry.endTime.slice(0, 5)}</span>
                  {streak > 0 && <Badge variant="caution">🔥 {streak}</Badge>}
                  {isCounterHabit && <Badge variant="outline">{entry.task.todayCheckInCount ?? 0}/{targetCount} today</Badge>}
                  {hasOverlap && <Badge variant="critical">Overlaps</Badge>}
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5">
                  {isCounterHabit ? (
                    <Button size="sm" onClick={() => onCheckIn(entry.taskId)} disabled={busy}>
                      Check in ({entry.task.todayCheckInCount ?? 0}/{targetCount})
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => onComplete(entry.taskId)} disabled={busy}>Complete</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onUnschedule(entry.taskId)} disabled={busy}>Unschedule</Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
