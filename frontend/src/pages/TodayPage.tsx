import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isQueryError } from '../apiClient';
import { useAuth } from '../authContext';
import { useHabitMutations, useHomeTodayQuery } from '../hooks/useApiQueries';
import { formatEnumLabel } from '../lib/enumLabels';
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader } from '../components/ui';
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Flame,
  Inbox,
  ListTodo,
  Plus,
  RefreshCw,
  Sparkles,
} from '../components/ui/icons';

interface TaskPreview {
  id?: number;
  title?: string;
  dueDate?: string | null;
  status?: string;
  priorityCategory?: string;
  followUpDate?: string | null;
  important?: boolean;
}

interface RecommendationPreview {
  task?: TaskPreview;
  recommendedAction?: string;
  confidence?: number;
  rank?: number;
}

interface ScheduledEntryPreview {
  kind?: 'TASK' | 'HABIT';
  id?: number;
  task?: TaskPreview;
  habit?: { title?: string };
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
}

interface HabitPreview {
  id?: number;
  title?: string;
  dailyTargetCount?: number;
  todayCheckInCount?: number;
  todayTargetMet?: boolean;
}

interface HomeTodaySummary {
  totalTasks?: number;
  overdueTasks?: number;
  dueToday?: number;
}

interface HomeToday {
  summary?: HomeTodaySummary;
  topRecommendations?: RecommendationPreview[];
  todayTimeline?: ScheduledEntryPreview[];
  scheduledFocusMinutes?: number;
  habitsToday?: HabitPreview[];
  habitsCompletedToday?: number;
  habitsTotalToday?: number;
  upcomingTasks?: TaskPreview[];
  waitingOrBlocked?: TaskPreview[];
  followUpsDue?: TaskPreview[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const asHomeToday = (value: unknown): HomeToday => (isRecord(value) ? value as HomeToday : {});

const shortDateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const formatShortDate = (value?: string | null) => {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : shortDateFormatter.format(date);
};

const formatTime = (value?: string) => {
  if (!value) return '';
  const [hours, minutes] = value.split(':');
  const date = new Date();
  date.setHours(Number(hours), Number(minutes ?? 0));
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
};

const formatFocusMinutes = (minutes = 0) => {
  if (minutes <= 0) return 'No focus time scheduled';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m scheduled`;
  return remaining === 0 ? `${hours}h scheduled` : `${hours}h ${remaining}m scheduled`;
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

function StatTile({ icon: Icon, label, value, tone }: { icon: typeof Calendar; label: string; value: string; tone?: 'critical' | 'default' }) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-line bg-card p-4 shadow-2xs">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone === 'critical' ? 'bg-critical/10 text-critical' : 'bg-brand-soft text-brand'}`}>
        <Icon className="h-4.5 w-4.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <strong className="block text-lg font-semibold tracking-tight text-fg tabular-nums">{value}</strong>
        <span className="text-xs text-fg-muted">{label}</span>
      </div>
    </article>
  );
}

function TaskRow({ task }: { task: TaskPreview }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => task.id !== undefined && navigate(`/tasks/${task.id}`)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-inset/30 px-3.5 py-2.5 text-left transition-colors duration-(--duration-fast) hover:bg-inset"
    >
      <span className="min-w-0 truncate text-sm font-medium text-fg">{task.title ?? 'Untitled task'}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        {task.important && <Badge variant="caution">Important</Badge>}
        {task.dueDate && <Badge variant="outline">{formatShortDate(task.dueDate)}</Badge>}
        {task.status && <Badge variant="outline">{formatEnumLabel(task.status)}</Badge>}
      </span>
    </button>
  );
}

function TaskListCard({ title, description, tasks, emptyMessage }: { title: string; description: string; tasks: TaskPreview[]; emptyMessage: string }) {
  return (
    <Card>
      <CardHeader title={title} description={description} actions={<Badge>{tasks.length}</Badge>} />
      {tasks.length === 0 ? (
        <p className="text-sm text-fg-muted">{emptyMessage}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task, index) => <TaskRow key={task.id ?? index} task={task} />)}
        </div>
      )}
    </Card>
  );
}

function TimelineCard({ entries }: { entries: ScheduledEntryPreview[] }) {
  const sorted = useMemo(() => [...entries].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')), [entries]);
  return (
    <Card aria-labelledby="today-timeline-title">
      <CardHeader title={<span id="today-timeline-title">Today's timeline</span>} description="Everything scheduled for today, tasks and habits together." />
      {sorted.length === 0 ? (
        <EmptyState icon={Clock} title="Nothing scheduled yet" description="Use Calendar -> Day to place tasks and habits into open time slots." />
      ) : (
        <ol className="flex flex-col gap-2">
          {sorted.map((entry, index) => (
            <li key={`${entry.kind}-${entry.id}-${index}`} className="flex items-center gap-3 rounded-lg border border-line bg-inset/30 px-3.5 py-2.5">
              <span className="w-20 shrink-0 text-xs font-medium text-fg-subtle tabular-nums">{formatTime(entry.startTime)}</span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                {entry.kind === 'HABIT' ? <Flame className="h-3.5 w-3.5" aria-hidden /> : <ListTodo className="h-3.5 w-3.5" aria-hidden />}
              </span>
              <span className="min-w-0 truncate text-sm font-medium text-fg">{entry.task?.title ?? entry.habit?.title ?? 'Untitled'}</span>
              <span className="ml-auto shrink-0 text-xs text-fg-subtle">{entry.durationMinutes ?? 0}m</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function RecommendationsCard({ recommendations }: { recommendations: RecommendationPreview[] }) {
  const navigate = useNavigate();
  return (
    <Card aria-labelledby="today-recommendations-title">
      <CardHeader
        title={
          <span id="today-recommendations-title" className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-brand" aria-hidden />
            Top recommended tasks
          </span>
        }
        description="Ranked by priority, due date, effort, and follow-up timing."
      />
      {recommendations.length === 0 ? (
        <p className="text-sm text-fg-muted">No recommendations yet. Add a few active tasks to see suggestions here.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {recommendations.map((recommendation, index) => (
            <button
              key={recommendation.task?.id ?? index}
              type="button"
              onClick={() => recommendation.task?.id !== undefined && navigate(`/tasks/${recommendation.task.id}`)}
              className="flex w-full items-center gap-3 rounded-lg border border-line bg-inset/30 px-3.5 py-2.5 text-left transition-colors duration-(--duration-fast) hover:bg-inset"
            >
              <span className="text-sm font-semibold text-fg-subtle tabular-nums">#{recommendation.rank ?? index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{recommendation.task?.title ?? 'Untitled task'}</span>
              {recommendation.recommendedAction && <Badge variant="positive">{recommendation.recommendedAction}</Badge>}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function HabitsTodayCard({ habits }: { habits: HabitPreview[] }) {
  const { checkIn, undoCheckIn } = useHabitMutations();
  const busy = checkIn.isPending || undoCheckIn.isPending;

  return (
    <Card aria-labelledby="today-habits-title">
      <CardHeader title={<span id="today-habits-title">Habits</span>} description="One tap to check in." actions={<Link to="/habits" className="text-sm font-medium text-brand hover:underline">All habits</Link>} />
      {habits.length === 0 ? (
        <EmptyState icon={Flame} title="No habits yet" description="Add a daily routine to start tracking streaks." action={<Link to="/habits"><Button size="sm"><Plus className="h-4 w-4" aria-hidden />Add a habit</Button></Link>} />
      ) : (
        <div className="flex flex-col gap-2">
          {habits.map((habit) => {
            const met = habit.todayTargetMet ?? (habit.todayCheckInCount ?? 0) >= (habit.dailyTargetCount ?? 1);
            return (
              <div key={habit.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-inset/30 px-3.5 py-2.5">
                <span className="min-w-0 truncate text-sm font-medium text-fg">{habit.title}</span>
                <Button
                  size="sm"
                  variant={met ? 'ghost' : 'primary'}
                  disabled={busy || habit.id === undefined}
                  onClick={() => habit.id !== undefined && (met ? undoCheckIn.mutate(habit.id) : checkIn.mutate(habit.id))}
                >
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  {met ? 'Checked in' : 'Check in'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function TodayPage() {
  const { user } = useAuth();
  const query = useHomeTodayQuery(true);
  const today = useMemo(() => asHomeToday(query.data?.data), [query.data]);
  const isLoading = query.isLoading;
  const hasError = isQueryError(query.data);
  const hasAnyData = (today.summary?.totalTasks ?? 0) > 0 || (today.habitsTotalToday ?? 0) > 0;
  const isNewAccount = !isLoading && !hasError && !hasAnyData;
  const displayName = user?.displayName || user?.email?.split('@')[0];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`${greeting()}${displayName ? `, ${displayName}` : ''}`}
        description={todayLabel}
        actions={
          <>
            <Button size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              {query.isFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Link to="/tasks?quickAdd=1" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3.5 text-sm font-medium text-brand-fg hover:bg-brand-hover">
              <Plus className="h-4 w-4" aria-hidden />
              Quick add
            </Link>
          </>
        }
        className="mb-0"
      />

      {isLoading && <p className="text-sm text-fg-muted" role="status" aria-live="polite">Loading today...</p>}

      {hasError && (
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load today's view"
          description="Something went wrong reaching the server."
          action={<Button size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>{query.isFetching ? 'Retrying...' : 'Retry'}</Button>}
        />
      )}

      {isNewAccount && (
        <EmptyState
          icon={Inbox}
          title="Welcome to Tracker"
          description="Add your first task or habit to see your day come together here."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/tasks?quickAdd=1"><Button size="sm" variant="primary"><Plus className="h-4 w-4" aria-hidden />Add a task</Button></Link>
              <Link to="/habits"><Button size="sm"><Flame className="h-4 w-4" aria-hidden />Add a habit</Button></Link>
            </div>
          }
        />
      )}

      {!isLoading && !hasError && !isNewAccount && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={Calendar} label="Due today" value={String(today.summary?.dueToday ?? 0)} />
            <StatTile icon={AlertTriangle} label="Overdue" value={String(today.summary?.overdueTasks ?? 0)} tone={((today.summary?.overdueTasks ?? 0) > 0) ? 'critical' : 'default'} />
            <StatTile icon={Flame} label="Habits completed" value={`${today.habitsCompletedToday ?? 0}/${today.habitsTotalToday ?? 0}`} />
            <StatTile icon={Clock} label="Focus time" value={formatFocusMinutes(today.scheduledFocusMinutes)} />
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="flex flex-col gap-4">
              <TimelineCard entries={today.todayTimeline ?? []} />
              <RecommendationsCard recommendations={today.topRecommendations ?? []} />
              <TaskListCard title="Upcoming" description="Due in the next 6 days." tasks={today.upcomingTasks ?? []} emptyMessage="Nothing else due soon." />
            </div>
            <div className="flex flex-col gap-4">
              <HabitsTodayCard habits={today.habitsToday ?? []} />
              <TaskListCard title="Waiting & blocked" description="Work that needs someone else or is stuck." tasks={today.waitingOrBlocked ?? []} emptyMessage="Nothing is waiting or blocked." />
              <TaskListCard title="Follow-ups due" description="Check-ins you set for yourself." tasks={today.followUpsDue ?? []} emptyMessage="No follow-ups due." />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
