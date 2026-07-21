import { useState, type ComponentType, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { usePlanningProjectBoardQuery, usePlanningRecommendationsQuery, usePlanningTodayQuery, usePlanningWeeklyQuery, useSettingsQuery } from '../hooks/useApiQueries';
import { Badge, Button, Card, PageHeader, SegmentedControl, cn, type BadgeVariant } from '../components/ui';
import { Calendar, CheckCircle2, ChevronRight, Eye, Flag, RefreshCw, Sparkles, TrendingUp } from '../components/ui/icons';
import { formatEnumLabel } from '../lib/enumLabels';

interface TaskPreview {
  id?: number | string;
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  status?: string;
  priorityScore?: number;
  priorityCategory?: string;
  priorityReason?: string | null;
  important?: boolean;
  effort?: string;
}

interface PlannerRisk {
  level?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  reason?: string;
}

interface PlannerTask {
  id?: number | string;
  title?: string;
  status?: string;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  estimatedHours?: number;
  parentTaskId?: number | string | null;
  subtaskCount?: number;
  completedSubtaskCount?: number;
  subtaskProgressPercent?: number;
  aggregateEstimatedHours?: number;
  risk?: PlannerRisk;
  dependencyIds?: unknown;
  blockingTaskIds?: unknown;
  blockers?: unknown;
}

interface PlannerColumn {
  key?: string;
  track?: string;
  phase?: string;
  status?: string;
  taskCount?: number;
  totalEstimatedHours?: number;
  remainingWorkingDays?: number;
  availableCapacityHours?: number;
  risk?: PlannerRisk;
  tasks?: unknown;
}

interface ProjectBoard {
  dailyCapacityHours?: number;
  calendar?: CalendarExclusions;
  remainingWorkingDays?: number;
  totalEstimatedHours?: number;
  availableCapacityHours?: number;
  risk?: PlannerRisk;
  columns?: unknown;
}

interface CalendarExclusions {
  excludedWeekdays?: unknown;
  holidayDates?: unknown;
}

interface RecommendationPreview {
  task?: TaskPreview;
  recommendedAction?: string;
  reasonCodes?: unknown;
  explanation?: string;
  confidence?: number;
  blockerWarnings?: unknown;
  rank?: number;
}

interface TodayPlan {
  overdue?: unknown;
  dueToday?: unknown;
  topPriority?: unknown;
}

interface DailyPlan {
  date?: string;
  tasks?: unknown;
}

const plannerDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});
const isoDateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const parsePlannerDate = (value?: string | null): Date | null => {
  if (!value) return null;

  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  if (isoDateOnlyPattern.test(trimmedValue)) {
    const [year, month, day] = trimmedValue.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return date;
    }

    return null;
  }

  const date = new Date(trimmedValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatPlannerDate = (value?: string | null, fallback = 'Date unavailable') => {
  const date = parsePlannerDate(value);
  return date ? plannerDateFormatter.format(date) : fallback;
};

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const utcDateKey = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

const formatPlannerShortDate = (value?: string | null, fallback = 'Date unavailable') => {
  const date = parsePlannerDate(value);

  if (!date) return fallback;

  const shortDate = shortDateFormatter.format(date);
  return utcDateKey(date) === utcDateKey(new Date()) ? `Today, ${shortDate}` : shortDate;
};

const normalizeUiText = (value?: string | null, fallback = '') => (value ?? fallback).replaceAll('Mecahnism', 'Mechanism');

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const asTasks = (value: unknown): TaskPreview[] => Array.isArray(value) ? value.filter(isRecord) as TaskPreview[] : [];
const asRecommendations = (value: unknown): RecommendationPreview[] => Array.isArray(value) ? value.filter(isRecord) as RecommendationPreview[] : [];
const asStrings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const asPlannerColumns = (value: unknown): PlannerColumn[] => Array.isArray(value) ? value.filter(isRecord) as PlannerColumn[] : [];
const asPlannerTasks = (value: unknown): PlannerTask[] => Array.isArray(value) ? value.filter(isRecord) as PlannerTask[] : [];
const asIds = (value: unknown): Array<string | number> => Array.isArray(value) ? value.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number') : [];
const formatHours = (value?: number | null) => typeof value === 'number' ? `${value.toFixed(1)}h` : 'No estimate';
const riskBadgeVariant = (level?: string): BadgeVariant => {
  const normalized = (level ?? 'LOW').toUpperCase();
  if (normalized === 'HIGH' || normalized === 'CRITICAL') return 'critical';
  if (normalized === 'MEDIUM') return 'caution';
  return 'neutral';
};
const taskKey = (task: TaskPreview, index: number) => task.id ?? `${normalizeUiText(task.title, 'task')}-${index}`;

type IconComponent = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

function MetricItem({ icon: Icon, label, value, title }: { icon: IconComponent; label: string; value: string | number; title?: string }) {
  return (
    <div className="flex items-center gap-2" title={title}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-inset text-fg-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[11px] text-fg-subtle">{label}</span>
        <strong className="truncate text-sm font-medium text-fg">{value}</strong>
      </span>
    </div>
  );
}

const recommendationTags = (recommendation: RecommendationPreview) => asStrings(recommendation.reasonCodes);
const formatBadgeLabel = (value: string | number) => normalizeUiText(formatEnumLabel(value));
const formatReasonCode = (reason: string) => {
  if (reason.endsWith('_EFFORT')) return `Effort: ${formatEnumLabel(reason.replace('_EFFORT', ''))}`;
  if (reason.startsWith('EFFORT_')) return `Effort: ${formatEnumLabel(reason.replace('EFFORT_', ''))}`;
  return formatBadgeLabel(reason);
};

const suggestionSummary = (recommendation: RecommendationPreview) => {
  const codes = new Set(recommendationTags(recommendation));
  const status = recommendation.task?.status;

  if (codes.has('DUE_TODAY') && (codes.has('ALREADY_IN_PROGRESS') || status === 'IN_PROGRESS') && codes.has('FOLLOW_UP_TODAY')) {
    return 'Due today with status IN_PROGRESS and needs follow-up today.';
  }

  if ((codes.has('ALREADY_IN_PROGRESS') || status === 'IN_PROGRESS') && (codes.has('FOLLOW_UP_SOON') || codes.has('FOLLOW_UP_TODAY') || codes.has('FOLLOW_UP_OVERDUE'))) {
    return 'Status IN_PROGRESS with an upcoming follow-up.';
  }

  if (codes.has('DUE_SOON') || codes.has('FOLLOW_UP_SOON')) {
    return 'Due soon and ready to continue.';
  }

  if (codes.has('DUE_TODAY')) {
    return status === 'IN_PROGRESS' ? 'Due today with status IN_PROGRESS and ready for action.' : 'Due today and ready for action.';
  }

  return 'Recommended next action based on current task signals.';
};

const recommendationChips = (recommendation: RecommendationPreview) => {
  const effort = recommendation.task?.effort;
  const tags = recommendationTags(recommendation);
  const hasEffortChip = tags.some((tag) => tag.includes('EFFORT'));
  return effort && !hasEffortChip ? [...tags, `EFFORT_${effort}`] : tags;
};

function TaskSuggestionCard({ recommendation }: { recommendation: RecommendationPreview }) {
  const task = recommendation.task;
  const confidence = typeof recommendation.confidence === 'number' ? Math.round(recommendation.confidence * 100) : undefined;
  const tags = recommendationChips(recommendation);
  const summary = suggestionSummary(recommendation);
  const taskTitle = normalizeUiText(task?.title, 'Untitled task');

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-line bg-inset/30 p-5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-fg-subtle tabular-nums">#{recommendation.rank ?? 1}</span>
        {recommendation.recommendedAction && <Badge variant="positive">{formatBadgeLabel(recommendation.recommendedAction)}</Badge>}
      </div>
      <div>
        <h4 className="text-base font-semibold text-fg">{taskTitle}</h4>
        <p className="mt-1 text-sm text-fg-muted">{summary}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Top recommendation metadata">
        <MetricItem icon={Calendar} label="Due date" value={formatPlannerShortDate(task?.dueDate, 'Due date unavailable')} title={formatPlannerDate(task?.dueDate, 'Due date unavailable')} />
        {task?.status && <MetricItem icon={CheckCircle2} label="Status" value={formatEnumLabel(task.status)} />}
        {task?.priorityCategory && <MetricItem icon={Flag} label="Priority" value={formatEnumLabel(task.priorityCategory)} />}
        {typeof task?.priorityScore === 'number' && <MetricItem icon={TrendingUp} label="Score" value={task.priorityScore} />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {typeof confidence === 'number' && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-fg-muted">Confidence</span>
            <Badge variant="positive">{`${confidence}%`}</Badge>
          </div>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Recommendation reason codes">
            {tags.map((reason) => <Badge key={reason} variant={reason.includes('PROGRESS') ? 'brand' : reason.includes('SOON') ? 'neutral' : 'caution'}>{formatReasonCode(reason)}</Badge>)}
          </div>
        )}
      </div>
      {asStrings(recommendation.blockerWarnings).length > 0 && (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-critical">
          {asStrings(recommendation.blockerWarnings).map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}
    </article>
  );
}

function SecondarySuggestionCard({ recommendation, fallbackRank }: { recommendation: RecommendationPreview; fallbackRank: number }) {
  const navigate = useNavigate();
  const task = recommendation.task;
  const summary = 'Due today and ready for action.';
  const taskTitle = normalizeUiText(task?.title, 'Untitled task');

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line p-4">
      <div className="flex items-start gap-2">
        <span className="text-sm font-semibold text-fg-subtle tabular-nums">#{recommendation.rank ?? fallbackRank}</span>
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-fg">{taskTitle}</h4>
          {recommendation.recommendedAction && <Badge variant="positive" className="mt-1">{formatBadgeLabel(recommendation.recommendedAction)}</Badge>}
        </div>
      </div>
      <p className="text-sm text-fg-muted">{summary}</p>
      <div className="flex flex-col gap-2" aria-label="Secondary recommendation metadata">
        <MetricItem icon={Calendar} label="Due date" value={formatPlannerShortDate(task?.dueDate, 'Due date unavailable')} title={formatPlannerDate(task?.dueDate, 'Due date unavailable')} />
        {task?.status && <MetricItem icon={CheckCircle2} label="Status" value={formatEnumLabel(task.status)} />}
        {task?.priorityCategory && <MetricItem icon={Flag} label="Priority" value={formatEnumLabel(task.priorityCategory)} />}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={task?.id === undefined}
        onClick={() => task?.id !== undefined && navigate(`/tasks/${task.id}`)}
      >
        <Eye className="h-4 w-4" aria-hidden />
        View details
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </article>
  );
}

const weekdayLabel = (weekday: string) => weekday.charAt(0).toUpperCase() + weekday.slice(1).toLowerCase();

function CalendarExclusionSummary({ data }: { data: unknown }) {
  const record = isRecord(data) ? data : {};
  const calendar = isRecord(record.calendar) ? record.calendar : record;
  const excludedWeekdays = asStrings(calendar.excludedWeekdays).map(weekdayLabel);
  const holidayDates = asStrings(calendar.holidayDates);
  const dailyCapacity = typeof record.dailyCapacityHours === 'number' ? record.dailyCapacityHours : typeof record.defaultDailyCapacityHours === 'number' ? record.defaultDailyCapacityHours : undefined;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-inset/30 px-4 py-3" aria-label="Active calendar exclusions">
      <div>
        <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Active calendar exclusions</p>
        <p className="mt-0.5 text-sm text-fg-muted">Planning skips these weekdays and holiday dates when calculating schedule capacity and risk.</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline">Weekdays: {excludedWeekdays.length ? excludedWeekdays.join(', ') : 'None'}</Badge>
        <Badge variant="outline">Holidays: {holidayDates.length ? holidayDates.map((date) => formatPlannerDate(date, date)).join(', ') : 'None'}</Badge>
        {typeof dailyCapacity === 'number' && <Badge variant="outline">Capacity: {formatHours(dailyCapacity)} / day</Badge>}
      </div>
    </div>
  );
}

function TaskList({ tasks, emptyMessage }: { tasks: TaskPreview[]; emptyMessage: string }) {
  if (tasks.length === 0) return <p className="text-sm text-fg-subtle">{emptyMessage}</p>;

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task, index) => (
        <article key={taskKey(task, index)} className="flex flex-col gap-2 rounded-lg border border-line bg-card p-3">
          <div>
            <h4 className="text-sm font-medium text-fg">{normalizeUiText(task.title, 'Untitled task')}</h4>
            {task.description && <p className="mt-0.5 text-sm text-fg-muted">{normalizeUiText(task.description)}</p>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {task.dueDate && <Badge variant="outline">Due {formatPlannerDate(task.dueDate, 'Due date unavailable')}</Badge>}
            {task.status && <Badge variant="outline">{formatEnumLabel(task.status)}</Badge>}
            {typeof task.priorityScore === 'number' && <Badge variant="outline">Score {task.priorityScore}</Badge>}
            {task.important && <Badge variant="caution">Important</Badge>}
          </div>
          {task.priorityReason && <p className="text-xs text-fg-subtle">{task.priorityReason}</p>}
        </article>
      ))}
    </div>
  );
}

function RecommendationsPanel({ data, isFetching, onRefresh }: { data: unknown; isFetching: boolean; onRefresh: () => void }) {
  const recommendations = asRecommendations(data);
  const [topRecommendation, ...otherRecommendations] = recommendations;

  return (
    <Card aria-labelledby="recommended-task-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-brand uppercase">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Smart suggestions
          </p>
          <h3 id="recommended-task-title" className="mt-1 text-base font-semibold text-fg">Recommended next task</h3>
          <p className="mt-0.5 text-sm text-fg-muted">Ranked by priority, due date, effort, status, follow-up timing, and blocker context.</p>
        </div>
        <Button onClick={onRefresh} disabled={isFetching}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          {isFetching ? 'Refreshing...' : 'Refresh suggestions'}
        </Button>
      </div>

      {!topRecommendation ? (
        <p className="text-sm text-fg-muted">No recommendations yet. Add active tasks or refresh after updating task details.</p>
      ) : (
        <div className={cn('grid gap-4', otherRecommendations.length > 0 && 'lg:grid-cols-[2fr_1fr]')}>
          <TaskSuggestionCard recommendation={topRecommendation} />

          {otherRecommendations.length > 0 && (
            <aside className="flex flex-col gap-3" aria-label="More smart suggestions">
              <h4 className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">More smart suggestions</h4>
              {otherRecommendations.slice(0, 1).map((recommendation, index) => (
                <SecondarySuggestionCard key={`${recommendation.rank ?? index}-${recommendation.task?.id ?? normalizeUiText(recommendation.task?.title, 'suggestion')}`} recommendation={recommendation} fallbackRank={index + 2} />
              ))}
            </aside>
          )}
        </div>
      )}
    </Card>
  );
}

function SectionCard({ title, description, count, children }: { title: ReactNode; description: string; count: number; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4 shadow-2xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-fg">{title}</h3>
          <p className="mt-0.5 text-sm text-fg-muted">{description}</p>
        </div>
        <Badge>{count}</Badge>
      </div>
      {children}
    </section>
  );
}

function TodayPlanningView({ data }: { data: unknown }) {
  const today = isRecord(data) ? data as TodayPlan : {};
  const sections = [
    { title: 'Overdue', description: 'Resolve these first to reduce schedule risk.', tasks: asTasks(today.overdue), empty: 'No overdue tasks in this plan.' },
    { title: 'Due today', description: 'Work that needs attention before the day ends.', tasks: asTasks(today.dueToday), empty: 'No tasks due today.' },
    { title: 'Top priority', description: 'Highest scoring work selected by the priority engine.', tasks: asTasks(today.topPriority), empty: 'No priority recommendations yet.' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sections.map((section) => (
        <SectionCard key={section.title} title={section.title} description={section.description} count={section.tasks.length}>
          <TaskList tasks={section.tasks} emptyMessage={section.empty} />
        </SectionCard>
      ))}
    </div>
  );
}

function WeeklyPlanningView({ data }: { data: unknown }) {
  if (!Array.isArray(data)) return <pre className="overflow-x-auto rounded-lg bg-inset p-3 font-mono text-xs text-fg-muted">{JSON.stringify(data, null, 2)}</pre>;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.map((day, index) => {
        const plan = isRecord(day) ? day as DailyPlan : {};
        const tasks = asTasks(plan.tasks);
        return (
          <SectionCard
            key={plan.date ?? index}
            title={formatPlannerDate(plan.date, `Day ${index + 1}`)}
            description={`${tasks.length} planned task${tasks.length === 1 ? '' : 's'}`}
            count={tasks.length}
          >
            <TaskList tasks={tasks} emptyMessage="No tasks planned for this day." />
          </SectionCard>
        );
      })}
    </div>
  );
}

function ProjectBoardView({ data }: { data: unknown }) {
  const board = isRecord(data) ? data as ProjectBoard : {};
  const columns = asPlannerColumns(board.columns);

  return (
    <div className="flex flex-col gap-4">
      <CalendarExclusionSummary data={board} />
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-card p-4 shadow-2xs">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Schedule capacity</p>
          <h3 className="mt-1 text-base font-semibold text-fg">{formatHours(board.totalEstimatedHours)} estimated / {formatHours(board.availableCapacityHours)} available</h3>
          <p className="mt-0.5 text-sm text-fg-muted">{board.risk?.reason ?? 'Capacity is calculated from remaining working days and task estimates.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-fg-muted" aria-label="Capacity metrics">
          <span><strong className="font-semibold text-fg tabular-nums">{board.remainingWorkingDays ?? 0}</strong> working days</span>
          <span><strong className="font-semibold text-fg tabular-nums">{formatHours(board.dailyCapacityHours)}</strong> per day</span>
          <Badge variant={riskBadgeVariant(board.risk?.level)}>{board.risk?.level ?? 'LOW'} risk</Badge>
        </div>
      </div>

      {columns.length === 0 ? (
        <p className="text-sm text-fg-muted">No active project tasks are available for the board.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="list" aria-label="Project planner columns">
          {columns.map((column, index) => {
            const tasks = asPlannerTasks(column.tasks);
            const overloaded = column.risk?.level === 'HIGH';
            return (
              <section
                key={column.key ?? `${column.track}-${column.phase}-${index}`}
                className={cn('flex flex-col gap-3 rounded-xl border border-line bg-card p-4 shadow-2xs', overloaded && 'border-critical/50')}
                role="listitem"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">{column.track ?? 'Unassigned track'}</p>
                    <h3 className="mt-0.5 text-sm font-semibold text-fg">{column.phase ?? 'Unassigned phase'}</h3>
                    {column.status && <p className="mt-0.5 text-xs text-fg-muted">Status lane: {formatEnumLabel(column.status)}</p>}
                  </div>
                  <Badge variant={riskBadgeVariant(column.risk?.level)}>{column.risk?.level ?? 'LOW'}</Badge>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 border-y border-line py-2 text-xs text-fg-muted tabular-nums">
                  <span>{formatHours(column.totalEstimatedHours)} estimate</span>
                  <span>{formatHours(column.availableCapacityHours)} capacity</span>
                  <span>{column.remainingWorkingDays ?? 0} days</span>
                </div>
                {column.risk?.reason && <p className="text-xs text-caution">{column.risk.reason}</p>}

                <div className="flex flex-col gap-2">
                  {tasks.map((task, taskIndex) => {
                    const blockers = asStrings(task.blockers);
                    const dependencies = asIds(task.dependencyIds);
                    const blocking = asIds(task.blockingTaskIds);
                    return (
                      <article key={task.id ?? `${normalizeUiText(task.title, 'task')}-${taskIndex}`} className="flex flex-col gap-2 rounded-lg border border-line bg-inset/30 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="min-w-0 text-sm font-medium text-fg">{normalizeUiText(task.title, 'Untitled task')}</h4>
                          <Badge variant={riskBadgeVariant(task.risk?.level)}>{task.risk?.level ?? 'LOW'}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {task.status && <Badge variant="outline">{formatEnumLabel(task.status)}</Badge>}
                          <Badge variant="outline">Due {formatPlannerDate(task.dueDate, 'No due date')}</Badge>
                          <Badge variant="outline">Estimate {formatHours(task.estimatedHours)}</Badge>
                          {typeof task.aggregateEstimatedHours === 'number' && task.aggregateEstimatedHours !== task.estimatedHours && <Badge variant="outline">With subtasks {formatHours(task.aggregateEstimatedHours)}</Badge>}
                          {typeof task.subtaskCount === 'number' && task.subtaskCount > 0 && <Badge variant="outline">Subtasks {task.completedSubtaskCount ?? 0}/{task.subtaskCount} ({task.subtaskProgressPercent ?? 0}%)</Badge>}
                          {task.parentTaskId && <Badge variant="outline">Parent #{task.parentTaskId}</Badge>}
                        </div>
                        {task.risk?.reason && <p className="text-xs text-caution">{task.risk.reason}</p>}
                        <div className="flex flex-col gap-0.5 text-xs text-fg-muted">
                          <span>Dependencies: {dependencies.length ? dependencies.join(', ') : 'None'}</span>
                          <span>Blocks: {blocking.length ? blocking.join(', ') : 'None'}</span>
                          {blockers.length > 0 && <span className="font-medium text-critical">Blockers: {blockers.join('; ')}</span>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PlanningPage() {
  const [selected, setSelected] = useState<'board' | 'today' | 'weekly'>('board');
  const board = usePlanningProjectBoardQuery(selected === 'board');
  const today = usePlanningTodayQuery(selected === 'today');
  const weekly = usePlanningWeeklyQuery(selected === 'weekly');
  const recommendations = usePlanningRecommendationsQuery(true);
  const settings = useSettingsQuery(true);
  const active = selected === 'board' ? board : selected === 'today' ? today : weekly;
  const hasData = Boolean(active.data?.ok && active.data.data);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Planning"
        description="Review today’s focus or generate a seven-day plan."
        actions={
          <Button variant="primary" onClick={() => active.refetch()} disabled={active.isFetching}>
            {active.isFetching ? 'Refreshing...' : selected === 'board' ? 'Refresh board' : selected === 'today' ? 'Refresh today' : 'Refresh weekly'}
          </Button>
        }
        className="mb-0"
      />

      <RecommendationsPanel data={recommendations.data?.data} isFetching={recommendations.isFetching} onRefresh={() => recommendations.refetch()} />

      <section className="flex flex-col gap-4" aria-labelledby="planning-content-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="planning-content-title" className="text-base font-semibold text-fg">Plan view</h3>
            <p className="mt-0.5 text-sm text-fg-muted">Switch between project capacity, focused daily triage, and the weekly schedule.</p>
          </div>
          <SegmentedControl
            aria-label="Planning mode"
            value={selected}
            onValueChange={setSelected}
            options={[
              { value: 'board', label: 'Project board' },
              { value: 'today', label: 'Today' },
              { value: 'weekly', label: 'Weekly' },
            ]}
          />
        </div>
        <QueryState isLoading={active.isLoading || active.isFetching} isError={isQueryError(active.data)} isEmpty={!active.isLoading && Boolean(active.data && !active.data.data)} />
        {selected !== 'board' && <CalendarExclusionSummary data={settings.data?.data} />}
        {hasData && (selected === 'board' ? <ProjectBoardView data={active.data?.data} /> : selected === 'today' ? <TodayPlanningView data={active.data?.data} /> : <WeeklyPlanningView data={active.data?.data} />)}
      </section>
    </div>
  );
}
