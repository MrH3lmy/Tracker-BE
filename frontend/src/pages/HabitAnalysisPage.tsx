import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { StackedProgressBar, type StackedProgressSegment } from '../components/StackedProgressBar';
import {
  computeDayCompletion,
  computeHabitStats,
  getHeatmapWeeks,
  heatmapLevel,
  type HabitAnalysisStats,
  type HabitTrend,
} from '../components/habits/habitAnalysis';
import { buildHistoryMap, inferHabitIcon, toDateKey, HABIT_CATEGORY_LABELS, WEEKDAY_SHORT_LABELS } from '../components/habits/habitPresentation';
import { HABIT_CATEGORY_VALUES, type HabitRecord } from '../components/habits/habitTypes';
import { useHabitHistoryQuery, useHabitsQuery } from '../hooks/useApiQueries';
import { Badge, Card, CardHeader, PageHeader, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, cn } from '../components/ui';
import { ChevronLeft, Minus, TrendingDown, TrendingUp } from '../components/ui/icons';

const WEEK_COUNT = 12;

const CATEGORY_VARIANTS: Record<string, StackedProgressSegment['variant']> = {
  WORK: 'primary',
  HEALTH: 'success',
  FAMILY: 'warning',
  STUDY: 'accent',
  PERSONAL: 'neutral',
};

const HEATMAP_LEVEL_CLASSES: Record<number, string> = {
  0: 'bg-inset',
  1: 'bg-brand/15',
  2: 'bg-brand/35',
  3: 'bg-brand/55',
  4: 'bg-brand/75',
  5: 'bg-brand',
};

const rangeLabel = (dates: Date[]) => {
  const monthDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  return `${monthDay.format(dates[0])} – ${monthDay.format(dates[dates.length - 1])}`;
};

const dayTitleLabel = (date: Date) => new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(date);

function TrendIndicator({ trend }: { trend: HabitTrend }) {
  if (trend === 'up') return <span className="inline-flex items-center gap-1 text-positive"><TrendingUp className="h-3.5 w-3.5" aria-hidden />Up</span>;
  if (trend === 'down') return <span className="inline-flex items-center gap-1 text-critical"><TrendingDown className="h-3.5 w-3.5" aria-hidden />Down</span>;
  if (trend === 'new') return <span className="text-fg-subtle">New</span>;
  return <span className="inline-flex items-center gap-1 text-fg-muted"><Minus className="h-3.5 w-3.5" aria-hidden />Flat</span>;
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="rounded-lg border border-line bg-inset/40 px-3.5 py-3">
      <strong className="block text-xl font-semibold tracking-tight text-fg tabular-nums">{value}</strong>
      <span className="text-xs text-fg-muted">{label}</span>
      {hint && <span className="mt-0.5 block text-[11px] text-fg-subtle">{hint}</span>}
    </article>
  );
}

export function HabitAnalysisPage() {
  const habitsQuery = useHabitsQuery();
  const habits = useMemo<HabitRecord[]>(() => {
    const data = habitsQuery.data?.data;
    return Array.isArray(data) ? (data as HabitRecord[]) : [];
  }, [habitsQuery.data]);

  const weeks = useMemo(() => getHeatmapWeeks(WEEK_COUNT), []);
  const rangeDates = useMemo(() => weeks.flat(), [weeks]);
  const from = toDateKey(rangeDates[0]);
  const to = toDateKey(new Date());

  const historyQuery = useHabitHistoryQuery(from, to);
  const historyEntries = useMemo(() => (Array.isArray(historyQuery.data?.data) ? historyQuery.data.data : []), [historyQuery.data]);
  const historyByHabit = useMemo(() => buildHistoryMap(historyEntries), [historyEntries]);

  const habitStats = useMemo<HabitAnalysisStats[]>(
    () => habits.map((habit) => computeHabitStats(habit, historyByHabit, rangeDates)),
    [habits, historyByHabit, rangeDates],
  );
  const statsByHabit = useMemo(() => new Map(habitStats.map((stat) => [stat.habitId, stat])), [habitStats]);
  const orderedHabits = useMemo(() => [...habits].sort((a, b) => (statsByHabit.get(b.id)?.completionRate ?? 0) - (statsByHabit.get(a.id)?.completionRate ?? 0)), [habits, statsByHabit]);

  const totals = useMemo(() => {
    const dueDays = habitStats.reduce((sum, stat) => sum + stat.dueDays, 0);
    const metDays = habitStats.reduce((sum, stat) => sum + stat.metDays, 0);
    const checkIns = habitStats.reduce((sum, stat) => sum + stat.totalCheckIns, 0);
    const bestCurrentStreak = habits.reduce((max, habit) => Math.max(max, habit.recurrence?.currentStreak ?? 0), 0);
    const bestEverStreak = habits.reduce((max, habit) => Math.max(max, habit.recurrence?.longestStreak ?? 0), 0);
    return {
      completionRate: dueDays > 0 ? Math.round((metDays / dueDays) * 100) : 0,
      checkIns,
      bestCurrentStreak,
      bestEverStreak,
    };
  }, [habitStats, habits]);

  const categorySegments = useMemo<StackedProgressSegment[]>(() => {
    const totalsByCategory = new Map<string, number>();
    for (const habit of habits) {
      const stat = statsByHabit.get(habit.id);
      if (!stat) continue;
      const category = habit.area ?? 'PERSONAL';
      totalsByCategory.set(category, (totalsByCategory.get(category) ?? 0) + stat.totalCheckIns);
    }
    return HABIT_CATEGORY_VALUES
      .map((category) => ({ label: HABIT_CATEGORY_LABELS[category], value: totalsByCategory.get(category) ?? 0, variant: CATEGORY_VARIANTS[category] }))
      .filter((segment) => segment.value > 0);
  }, [habits, statsByHabit]);

  const isLoading = habitsQuery.isLoading;
  const hasError = isQueryError(habitsQuery.data);
  const todayEnd = useMemo(() => { const end = new Date(); end.setHours(23, 59, 59, 999); return end.getTime(); }, []);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Habit analysis"
        description="Completion trends, streaks, and check-in history across your habits."
        actions={
          <Link
            to="/habits"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-card px-3.5 text-sm font-medium text-fg shadow-2xs hover:bg-inset"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Back to habits
          </Link>
        }
        className="mb-0"
      />

      <QueryState
        isLoading={isLoading}
        isError={hasError}
        isEmpty={!isLoading && !hasError && habits.length === 0}
        emptyMessage="No habits yet. Add one from the Habits page to see analysis here."
      />

      {!isLoading && !hasError && habits.length > 0 && (
        <>
          <Card>
            <CardHeader title="Last 12 weeks" description={rangeLabel(rangeDates)} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Overall completion" value={`${totals.completionRate}%`} hint="Of scheduled check-ins" />
              <StatTile label="Total check-ins" value={new Intl.NumberFormat().format(totals.checkIns)} />
              <StatTile label="Best active streak" value={`${totals.bestCurrentStreak}🔥`} />
              <StatTile label="Longest streak ever" value={`${totals.bestEverStreak}👑`} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Check-in activity"
              description="Share of scheduled habits completed each day."
              actions={<Badge variant="outline">{historyQuery.isLoading ? 'Loading…' : `${totals.checkIns} check-ins`}</Badge>}
            />
            <div className="overflow-x-auto">
              <div className="flex gap-1">
                <div className="flex shrink-0 flex-col gap-1 pr-1 pt-4">
                  {WEEKDAY_SHORT_LABELS.map((label, index) => (
                    <span key={index} className="flex h-3.5 items-center text-[10px] text-fg-subtle">{label}</span>
                  ))}
                </div>
                <div
                  className="flex gap-1"
                  role="img"
                  aria-label={`Check-in heatmap for the last ${WEEK_COUNT} weeks, ${totals.checkIns} total check-ins`}
                >
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {week.map((date) => {
                        const isFuture = date.getTime() > todayEnd;
                        if (isFuture) return <span key={date.toISOString()} className="h-3.5 w-3.5" aria-hidden />;
                        const day = computeDayCompletion(habits, historyByHabit, date);
                        const level = heatmapLevel(day);
                        const description = day.dueCount === 0
                          ? 'No habits scheduled'
                          : `${day.metCount}/${day.dueCount} habits completed, ${day.checkIns} check-ins`;
                        return (
                          <span
                            key={date.toISOString()}
                            title={`${dayTitleLabel(date)}: ${description}`}
                            className={cn('h-3.5 w-3.5 rounded-[3px]', HEATMAP_LEVEL_CLASSES[level])}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-fg-subtle">
              Less
              {[0, 1, 2, 3, 4, 5].map((level) => (
                <span key={level} className={cn('h-3 w-3 rounded-[3px]', HEATMAP_LEVEL_CLASSES[level])} aria-hidden />
              ))}
              More
            </div>
          </Card>

          {categorySegments.length > 0 && (
            <Card>
              <CardHeader title="Check-ins by category" />
              <StackedProgressBar label="Check-ins" segments={categorySegments} />
            </Card>
          )}

          <Card>
            <CardHeader title="Habits" description="Sorted by completion rate over the last 12 weeks." />
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Habit</TableHeaderCell>
                  <TableHeaderCell>Category</TableHeaderCell>
                  <TableHeaderCell>Completion</TableHeaderCell>
                  <TableHeaderCell>Check-ins</TableHeaderCell>
                  <TableHeaderCell>Current streak</TableHeaderCell>
                  <TableHeaderCell>Best streak</TableHeaderCell>
                  <TableHeaderCell>Trend</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderedHabits.map((habit) => {
                  const stat = statsByHabit.get(habit.id);
                  const categoryLabel = habit.area && habit.area in HABIT_CATEGORY_LABELS ? HABIT_CATEGORY_LABELS[habit.area as keyof typeof HABIT_CATEGORY_LABELS] : undefined;
                  const rate = stat ? Math.round(stat.completionRate) : 0;
                  return (
                    <TableRow key={habit.id}>
                      <TableCell className="font-medium">
                        <span className="mr-1.5" aria-hidden>{inferHabitIcon(habit.title, habit.area)}</span>
                        {habit.title}
                      </TableCell>
                      <TableCell>{categoryLabel ? <Badge variant="positive">{categoryLabel.toUpperCase()}</Badge> : <span className="text-fg-subtle">—</span>}</TableCell>
                      <TableCell>
                        {stat && stat.dueDays > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-inset">
                              <span className={cn('block h-full rounded-full', rate >= 75 ? 'bg-positive' : rate >= 40 ? 'bg-caution' : 'bg-critical')} style={{ width: `${rate}%` }} />
                            </div>
                            <span className="tabular-nums text-fg-muted">{rate}%</span>
                          </div>
                        ) : (
                          <span className="text-fg-subtle">No data</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">{stat?.totalCheckIns ?? 0}</TableCell>
                      <TableCell className="tabular-nums">{habit.recurrence?.currentStreak ? `🔥 ${habit.recurrence.currentStreak}` : '—'}</TableCell>
                      <TableCell className="tabular-nums">{habit.recurrence?.longestStreak ?? '—'}</TableCell>
                      <TableCell>{stat ? <TrendIndicator trend={stat.trend} /> : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
