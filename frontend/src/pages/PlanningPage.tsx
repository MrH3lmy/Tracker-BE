import { useState } from 'react';
import { RequestInspector } from '../components/RequestInspector';
import { QueryState } from '../components/QueryState';
import { latestResult, usePlanningProjectBoardQuery, usePlanningRecommendationsQuery, usePlanningTodayQuery, usePlanningWeeklyQuery, useSettingsQuery } from '../hooks/useApiQueries';

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

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const asTasks = (value: unknown): TaskPreview[] => Array.isArray(value) ? value.filter(isRecord) as TaskPreview[] : [];
const asRecommendations = (value: unknown): RecommendationPreview[] => Array.isArray(value) ? value.filter(isRecord) as RecommendationPreview[] : [];
const asStrings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const asPlannerColumns = (value: unknown): PlannerColumn[] => Array.isArray(value) ? value.filter(isRecord) as PlannerColumn[] : [];
const asPlannerTasks = (value: unknown): PlannerTask[] => Array.isArray(value) ? value.filter(isRecord) as PlannerTask[] : [];
const asIds = (value: unknown): Array<string | number> => Array.isArray(value) ? value.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number') : [];
const formatHours = (value?: number | null) => typeof value === 'number' ? `${value.toFixed(1)}h` : 'No estimate';
const riskClass = (level?: string) => `risk-${(level ?? 'LOW').toLowerCase()}`;
const taskKey = (task: TaskPreview, index: number) => task.id ?? `${task.title ?? 'task'}-${index}`;


const weekdayLabel = (weekday: string) => weekday.charAt(0).toUpperCase() + weekday.slice(1).toLowerCase();

function CalendarExclusionSummary({ data }: { data: unknown }) {
  const record = isRecord(data) ? data : {};
  const calendar = isRecord(record.calendar) ? record.calendar : record;
  const excludedWeekdays = asStrings(calendar.excludedWeekdays).map(weekdayLabel);
  const holidayDates = asStrings(calendar.holidayDates);
  const dailyCapacity = typeof record.dailyCapacityHours === 'number' ? record.dailyCapacityHours : typeof record.defaultDailyCapacityHours === 'number' ? record.defaultDailyCapacityHours : undefined;

  return (
    <div className="calendar-exclusion-summary" aria-label="Active calendar exclusions">
      <div>
        <p className="eyebrow">Active calendar exclusions</p>
        <p className="muted">Planning skips these weekdays and holiday dates when calculating schedule capacity and risk.</p>
      </div>
      <div className="task-preview-meta">
        <span className="pill">Weekdays: {excludedWeekdays.length ? excludedWeekdays.join(', ') : 'None'}</span>
        <span className="pill">Holidays: {holidayDates.length ? holidayDates.map((date) => formatPlannerDate(date, date)).join(', ') : 'None'}</span>
        {typeof dailyCapacity === 'number' && <span className="pill">Capacity: {formatHours(dailyCapacity)} / day</span>}
      </div>
    </div>
  );
}

function TaskList({ tasks, emptyMessage }: { tasks: TaskPreview[]; emptyMessage: string }) {
  if (tasks.length === 0) return <p className="muted">{emptyMessage}</p>;

  return (
    <div className="mini-card-list">
      {tasks.map((task, index) => (
        <article key={taskKey(task, index)} className="task-preview-card">
          <div>
            <h4>{task.title ?? 'Untitled task'}</h4>
            {task.description && <p>{task.description}</p>}
          </div>
          <div className="task-preview-meta">
            {task.dueDate && <span className="pill">Due {formatPlannerDate(task.dueDate, 'Due date unavailable')}</span>}
            {task.status && <span className="pill">{task.status}</span>}
            {typeof task.priorityScore === 'number' && <span className="pill">Score {task.priorityScore}</span>}
            {task.important && <span className="pill">Important</span>}
          </div>
          {task.priorityReason && <p className="muted">{task.priorityReason}</p>}
        </article>
      ))}
    </div>
  );
}


function RecommendationsPanel({ data, isFetching, onRefresh }: { data: unknown; isFetching: boolean; onRefresh: () => void }) {
  const recommendations = asRecommendations(data);
  const [topRecommendation, ...otherRecommendations] = recommendations;

  return (
    <section className="page-card recommendation-panel" aria-labelledby="recommended-task-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Smart suggestions</p>
          <h3 id="recommended-task-title">Recommended next task</h3>
          <p className="muted">Ranked with priority score, due date, effort, current status, follow-up timing, and blocker context.</p>
        </div>
        <button type="button" className="button-secondary" onClick={onRefresh} disabled={isFetching}>
          {isFetching ? 'Refreshing...' : 'Refresh suggestions'}
        </button>
      </div>

      {!topRecommendation ? (
        <p className="muted">No recommendations yet. Add active tasks or refresh after updating task details.</p>
      ) : (
        <div className="recommendation-content">
          <article className="recommendation-hero-card">
            <div className="recommendation-rank">#{topRecommendation.rank ?? 1}</div>
            <div className="recommendation-copy">
              <p className="eyebrow">{topRecommendation.recommendedAction ?? 'Do next'}</p>
              <h4>{topRecommendation.task?.title ?? 'Untitled task'}</h4>
              {topRecommendation.explanation && <p>{topRecommendation.explanation}</p>}
              <div className="task-preview-meta">
                {topRecommendation.task?.dueDate && <span className="pill">Due {formatPlannerDate(topRecommendation.task.dueDate, 'Due date unavailable')}</span>}
                {topRecommendation.task?.status && <span className="pill">{topRecommendation.task.status}</span>}
                {typeof topRecommendation.task?.priorityScore === 'number' && <span className="pill">Score {topRecommendation.task.priorityScore}</span>}
                {typeof topRecommendation.confidence === 'number' && <span className="pill">{Math.round(topRecommendation.confidence * 100)}% confidence</span>}
              </div>
              {asStrings(topRecommendation.reasonCodes).length > 0 && (
                <div className="task-preview-meta" aria-label="Recommendation reason codes">
                  {asStrings(topRecommendation.reasonCodes).map((reason) => <span key={reason} className="pill reason-pill">{reason.replaceAll('_', ' ')}</span>)}
                </div>
              )}
              {asStrings(topRecommendation.blockerWarnings).length > 0 && (
                <ul className="recommendation-warnings">
                  {asStrings(topRecommendation.blockerWarnings).map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              )}
            </div>
          </article>

          {otherRecommendations.length > 0 && (
            <div className="recommendation-sidebar">
              <h4>More smart suggestions</h4>
              <div className="mini-card-list">
                {otherRecommendations.slice(0, 4).map((recommendation, index) => (
                  <article key={`${recommendation.rank ?? index}-${recommendation.task?.id ?? recommendation.task?.title ?? 'suggestion'}`} className="task-preview-card compact">
                    <div className="section-card-header compact">
                      <div>
                        <h4>{recommendation.task?.title ?? 'Untitled task'}</h4>
                        <p className="muted">{recommendation.recommendedAction ?? 'Review next'}</p>
                      </div>
                      <span className="status-badge status-other">#{recommendation.rank ?? index + 2}</span>
                    </div>
                    {recommendation.explanation && <p className="muted">{recommendation.explanation}</p>}
                    {recommendation.task?.dueDate && (
                      <div className="task-preview-meta">
                        <span className="pill">Due {formatPlannerDate(recommendation.task.dueDate, 'Due date unavailable')}</span>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
    <div className="planning-section-grid">
      {sections.map((section) => (
        <section key={section.title} className="planning-section-card">
          <div className="section-card-header">
            <div>
              <h3>{section.title}</h3>
              <p>{section.description}</p>
            </div>
            <span className="status-badge status-other">{section.tasks.length}</span>
          </div>
          <TaskList tasks={section.tasks} emptyMessage={section.empty} />
        </section>
      ))}
    </div>
  );
}

function WeeklyPlanningView({ data }: { data: unknown }) {
  if (!Array.isArray(data)) return <pre>{JSON.stringify(data, null, 2)}</pre>;

  return (
    <div className="planning-section-grid weekly-plan-grid">
      {data.map((day, index) => {
        const plan = isRecord(day) ? day as DailyPlan : {};
        const tasks = asTasks(plan.tasks);
        return (
          <section key={plan.date ?? index} className="planning-section-card">
            <div className="section-card-header">
              <div>
                <h3>{formatPlannerDate(plan.date, `Day ${index + 1}`)}</h3>
                <p>{tasks.length} planned task{tasks.length === 1 ? '' : 's'}</p>
              </div>
              <span className="status-badge status-other">{tasks.length}</span>
            </div>
            <TaskList tasks={tasks} emptyMessage="No tasks planned for this day." />
          </section>
        );
      })}
    </div>
  );
}

function ProjectBoardView({ data }: { data: unknown }) {
  const board = isRecord(data) ? data as ProjectBoard : {};
  const columns = asPlannerColumns(board.columns);

  return (
    <div className="project-board-wrapper">
      <CalendarExclusionSummary data={board} />
      <div className={`project-board-summary ${riskClass(board.risk?.level)}`}>
        <div>
          <p className="eyebrow">Schedule capacity</p>
          <h3>{formatHours(board.totalEstimatedHours)} estimated / {formatHours(board.availableCapacityHours)} available</h3>
          <p>{board.risk?.reason ?? 'Capacity is calculated from remaining working days and task estimates.'}</p>
        </div>
        <div className="capacity-metrics" aria-label="Capacity metrics">
          <span><strong>{board.remainingWorkingDays ?? 0}</strong> working days</span>
          <span><strong>{formatHours(board.dailyCapacityHours)}</strong> per day</span>
          <span className={`risk-pill ${riskClass(board.risk?.level)}`}>{board.risk?.level ?? 'LOW'} risk</span>
        </div>
      </div>

      {columns.length === 0 ? (
        <p className="muted">No active project tasks are available for the board.</p>
      ) : (
        <div className="project-board-grid" role="list" aria-label="Project planner columns">
          {columns.map((column, index) => {
            const tasks = asPlannerTasks(column.tasks);
            const overloaded = column.risk?.level === 'HIGH';
            return (
              <section key={column.key ?? `${column.track}-${column.phase}-${index}`} className={`project-board-column ${riskClass(column.risk?.level)} ${overloaded ? 'overloaded-track' : ''}`} role="listitem">
                <div className="section-card-header compact">
                  <div>
                    <p className="eyebrow">{column.track ?? 'Unassigned track'}</p>
                    <h3>{column.phase ?? 'Unassigned phase'}</h3>
                    {column.status && <p className="muted">Status lane: {column.status}</p>}
                  </div>
                  <span className={`risk-pill ${riskClass(column.risk?.level)}`}>{column.risk?.level ?? 'LOW'}</span>
                </div>
                <div className="capacity-strip">
                  <span>{formatHours(column.totalEstimatedHours)} estimate</span>
                  <span>{formatHours(column.availableCapacityHours)} capacity</span>
                  <span>{column.remainingWorkingDays ?? 0} days</span>
                </div>
                {column.risk?.reason && <p className="risk-reason">{column.risk.reason}</p>}

                <div className="mini-card-list">
                  {tasks.map((task, taskIndex) => {
                    const blockers = asStrings(task.blockers);
                    const dependencies = asIds(task.dependencyIds);
                    const blocking = asIds(task.blockingTaskIds);
                    return (
                      <article key={task.id ?? `${task.title}-${taskIndex}`} className={`planner-task-card ${riskClass(task.risk?.level)}`}>
                        <div className="section-card-header compact">
                          <h4>{task.title ?? 'Untitled task'}</h4>
                          <span className={`risk-pill ${riskClass(task.risk?.level)}`}>{task.risk?.level ?? 'LOW'}</span>
                        </div>
                        <div className="task-preview-meta">
                          {task.status && <span className="pill">{task.status}</span>}
                          <span className="pill">Due {formatPlannerDate(task.dueDate, 'No due date')}</span>
                          <span className="pill">Estimate {formatHours(task.estimatedHours)}</span>
                        </div>
                        {task.risk?.reason && <p className="risk-reason">{task.risk.reason}</p>}
                        <div className="dependency-list">
                          <span>Dependencies: {dependencies.length ? dependencies.join(', ') : 'None'}</span>
                          <span>Blocks: {blocking.length ? blocking.join(', ') : 'None'}</span>
                          {blockers.length > 0 && <span className="blocker-text">Blockers: {blockers.join('; ')}</span>}
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
  const result = latestResult(board.data, today.data, weekly.data, recommendations.data);
  const hasData = Boolean(active.data?.ok && active.data.data);

  return (
    <div className="page-pattern planning-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Planning workspace</p>
          <h2>Planning</h2>
          <p>Review today’s focus or generate a seven-day plan before inspecting the raw API response.</p>
        </div>
        <button type="button" className="button-primary" onClick={() => active.refetch()} disabled={active.isFetching}>
          {active.isFetching ? 'Refreshing...' : selected === 'board' ? 'Refresh board' : selected === 'today' ? 'Refresh today' : 'Refresh weekly'}
        </button>
      </header>

      <RecommendationsPanel data={recommendations.data?.data} isFetching={recommendations.isFetching} onRefresh={() => recommendations.refetch()} />

      <section className="page-card main-content-card" aria-labelledby="planning-content-title">
        <div className="section-header">
          <div>
            <h3 id="planning-content-title">Plan view</h3>
            <p className="muted">Switch between project capacity, focused daily triage, and the weekly schedule.</p>
          </div>
          <div className="segmented-control" role="group" aria-label="Planning mode">
            <button type="button" className={selected === 'board' ? 'active' : undefined} onClick={() => setSelected('board')} disabled={active.isFetching}>Project board</button>
            <button type="button" className={selected === 'today' ? 'active' : undefined} onClick={() => setSelected('today')} disabled={active.isFetching}>Today</button>
            <button type="button" className={selected === 'weekly' ? 'active' : undefined} onClick={() => setSelected('weekly')} disabled={active.isFetching}>Weekly</button>
          </div>
        </div>
        <QueryState isLoading={active.isLoading || active.isFetching} isError={Boolean(active.data && !active.data.ok)} isEmpty={!active.isLoading && Boolean(active.data && !active.data.data)} />
        {selected !== 'board' && <CalendarExclusionSummary data={settings.data?.data} />}
        {hasData && (selected === 'board' ? <ProjectBoardView data={active.data?.data} /> : selected === 'today' ? <TodayPlanningView data={active.data?.data} /> : <WeeklyPlanningView data={active.data?.data} />)}
      </section>

      <section className="page-card diagnostics-card" aria-labelledby="planning-diagnostics-title">
        <h3 id="planning-diagnostics-title">Request diagnostics</h3>
        <p className="muted">Raw request and response history for the selected planning endpoint.</p>
        <RequestInspector result={result} />
      </section>
    </div>
  );
}
