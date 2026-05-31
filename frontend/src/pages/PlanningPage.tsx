import { useState } from 'react';
import { RequestInspector } from '../components/RequestInspector';
import { QueryState } from '../components/QueryState';
import { latestResult, usePlanningRecommendationsQuery, usePlanningTodayQuery, usePlanningWeeklyQuery } from '../hooks/useApiQueries';

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

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const asTasks = (value: unknown): TaskPreview[] => Array.isArray(value) ? value.filter(isRecord) as TaskPreview[] : [];
const asRecommendations = (value: unknown): RecommendationPreview[] => Array.isArray(value) ? value.filter(isRecord) as RecommendationPreview[] : [];
const asStrings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const taskKey = (task: TaskPreview, index: number) => task.id ?? `${task.title ?? 'task'}-${index}`;

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
            {task.dueDate && <span className="pill">Due {task.dueDate}</span>}
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
                {topRecommendation.task?.dueDate && <span className="pill">Due {topRecommendation.task.dueDate}</span>}
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
                <h3>{plan.date ?? `Day ${index + 1}`}</h3>
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

export function PlanningPage() {
  const [selected, setSelected] = useState<'today' | 'weekly'>('today');
  const today = usePlanningTodayQuery(selected === 'today');
  const weekly = usePlanningWeeklyQuery(selected === 'weekly');
  const recommendations = usePlanningRecommendationsQuery(true);
  const active = selected === 'today' ? today : weekly;
  const result = latestResult(today.data, weekly.data, recommendations.data);
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
          {active.isFetching ? 'Refreshing...' : selected === 'today' ? 'Refresh today' : 'Refresh weekly'}
        </button>
      </header>

      <RecommendationsPanel data={recommendations.data?.data} isFetching={recommendations.isFetching} onRefresh={() => recommendations.refetch()} />

      <section className="page-card main-content-card" aria-labelledby="planning-content-title">
        <div className="section-header">
          <div>
            <h3 id="planning-content-title">Plan view</h3>
            <p className="muted">Switch between focused daily triage and the weekly schedule.</p>
          </div>
          <div className="segmented-control" role="group" aria-label="Planning mode">
            <button type="button" className={selected === 'today' ? 'active' : undefined} onClick={() => setSelected('today')} disabled={active.isFetching}>Today</button>
            <button type="button" className={selected === 'weekly' ? 'active' : undefined} onClick={() => setSelected('weekly')} disabled={active.isFetching}>Weekly</button>
          </div>
        </div>
        <QueryState isLoading={active.isLoading || active.isFetching} isError={Boolean(active.data && !active.data.ok)} isEmpty={!active.isLoading && Boolean(active.data && !active.data.data)} />
        {hasData && (selected === 'today' ? <TodayPlanningView data={active.data?.data} /> : <WeeklyPlanningView data={active.data?.data} />)}
      </section>

      <section className="page-card diagnostics-card" aria-labelledby="planning-diagnostics-title">
        <h3 id="planning-diagnostics-title">Request diagnostics</h3>
        <p className="muted">Raw request and response history for the selected planning endpoint.</p>
        <RequestInspector result={result} />
      </section>
    </div>
  );
}
