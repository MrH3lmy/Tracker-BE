import { useMemo } from 'react';
import { isQueryError } from '../../apiClient';
import { QueryState } from '../QueryState';
import { addDaysToDateOnlyKey, todayDateOnlyKey } from '../../lib/dateOnly';
import { formatEnumLabel } from '../../lib/enumLabels';
import { useFocusAnalyticsQuery } from '../../hooks/useApiQueries';
import { Badge, Card, CardHeader } from '../ui';

const RANGE_DAYS = 30;

const formatHour = (hour: number) => {
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
};

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  return remaining === 0 ? `${hours}h` : `${hours}h ${remaining}m`;
};

export function FocusAnalyticsPanel() {
  const to = todayDateOnlyKey();
  const from = addDaysToDateOnlyKey(to, -(RANGE_DAYS - 1));
  const query = useFocusAnalyticsQuery(from, to);
  const analytics = query.data?.data;

  const dayEntries = useMemo(() => Object.entries(analytics?.minutesByDay ?? {}).sort(([a], [b]) => a.localeCompare(b)), [analytics]);
  const areaEntries = useMemo(() => Object.entries(analytics?.minutesByArea ?? {}).sort(([, a], [, b]) => b - a), [analytics]);
  const maxDayMinutes = useMemo(() => Math.max(1, ...dayEntries.map(([, minutes]) => minutes)), [dayEntries]);

  const isLoading = query.isLoading;
  const hasError = isQueryError(query.data);
  const hasData = Boolean(analytics && analytics.sessionCount > 0);

  return (
    <div className="flex flex-col gap-4">
      <QueryState
        isLoading={isLoading}
        isError={hasError}
        isEmpty={!isLoading && !hasError && !hasData}
        emptyMessage="No focus sessions in the last 30 days. Start a focus session from a task to see analytics here."
      />

      {hasData && analytics && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="text-center">
              <p className="text-lg font-bold text-fg">{formatMinutes(analytics.totalMinutes)}</p>
              <p className="text-xs text-fg-muted">Total focus time</p>
            </Card>
            <Card className="text-center">
              <p className="text-lg font-bold text-fg">{analytics.sessionCount}</p>
              <p className="text-xs text-fg-muted">Sessions</p>
            </Card>
            <Card className="text-center">
              <p className="text-lg font-bold text-fg">{analytics.mostProductiveHour !== undefined && analytics.mostProductiveHour !== null ? formatHour(analytics.mostProductiveHour) : '—'}</p>
              <p className="text-xs text-fg-muted">Most productive hour</p>
            </Card>
            <Card className="text-center">
              <p className="text-lg font-bold text-fg">{Math.round(analytics.totalMinutes / RANGE_DAYS)}m</p>
              <p className="text-xs text-fg-muted">Avg. per day</p>
            </Card>
          </div>

          <Card aria-labelledby="focus-by-day-title">
            <CardHeader title={<span id="focus-by-day-title">Focus time by day</span>} description={`Last ${RANGE_DAYS} days`} />
            {dayEntries.length === 0 ? (
              <p className="text-sm text-fg-muted">No sessions recorded yet.</p>
            ) : (
              <div className="flex h-24 items-end gap-1" role="img" aria-label="Focus minutes per day bar chart">
                {dayEntries.map(([day, minutes]) => (
                  <div key={day} className="group relative flex flex-1 flex-col items-center justify-end" title={`${day}: ${formatMinutes(minutes)}`}>
                    <div className="w-full rounded-t bg-brand" style={{ height: `${Math.max(4, (minutes / maxDayMinutes) * 100)}%` }} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card aria-labelledby="focus-by-area-title">
            <CardHeader title={<span id="focus-by-area-title">Focus time by area</span>} />
            {areaEntries.length === 0 ? (
              <p className="text-sm text-fg-muted">No sessions recorded yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {areaEntries.map(([area, minutes]) => (
                  <li key={area} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-fg">{area === 'UNASSIGNED' ? 'No task area' : formatEnumLabel(area)}</span>
                    <span className="text-fg-muted tabular-nums">{formatMinutes(minutes)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {analytics.estimateDivergences.length > 0 && (
            <Card aria-labelledby="focus-divergence-title">
              <CardHeader
                title={<span id="focus-divergence-title">Estimate vs. actual</span>}
                description="Tasks where actual focus time diverged from the estimate by 25% or more."
              />
              <ul className="flex flex-col gap-2">
                {analytics.estimateDivergences.map((divergence) => (
                  <li key={divergence.taskId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-fg">{divergence.taskTitle}</span>
                    <span className="flex shrink-0 items-center gap-2 text-fg-muted tabular-nums">
                      {formatMinutes(divergence.estimatedMinutes)} est. / {formatMinutes(divergence.actualMinutes)} actual
                      <Badge variant={divergence.actualMinutes > divergence.estimatedMinutes ? 'caution' : 'brand'}>{divergence.divergencePercent}%</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
