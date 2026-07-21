import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isQueryError } from '../apiClient';
import { useAnnouncement } from '../announcementContext';
import { QueryState } from '../components/QueryState';
import { formatDate, formatValue } from '../components/tasks/taskUtils';
import type { TaskRecord } from '../components/tasks/taskTypes';
import type { DecisionAction, TaskDecisionPayload } from '../components/weeklyreview/weeklyReviewTypes';
import { formatEnumLabel } from '../lib/enumLabels';
import { useNoteMutations, useWeeklyReviewDraftQuery, useWeeklyReviewMutations } from '../hooks/useApiQueries';
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, PageHeader, Textarea } from '../components/ui';
import { Archive, Calendar, Check, CheckCircle2, ChevronLeft, ChevronRight, Flame, FolderKanban, Trash2 } from '../components/ui/icons';

type StepId = 'completed' | 'overdue' | 'blocked' | 'habits' | 'projects' | 'stale' | 'summary';

const STEPS: { id: StepId; label: string }[] = [
  { id: 'completed', label: 'Completed' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'blocked', label: 'Blocked & waiting' },
  { id: 'habits', label: 'Habit performance' },
  { id: 'projects', label: 'Projects at risk' },
  { id: 'stale', label: 'Stale tasks' },
  { id: 'summary', label: 'Plan & summary' },
];

function decisionBadge(decision: TaskDecisionPayload | undefined) {
  if (!decision) return null;
  if (decision.action === 'RESCHEDULE') return <Badge variant="brand">Reschedule &rarr; {decision.newDueDate ? formatDate(decision.newDueDate) : ''}</Badge>;
  if (decision.action === 'ARCHIVE') return <Badge variant="neutral">Archived</Badge>;
  if (decision.action === 'DELETE') return <Badge variant="critical">Deleted</Badge>;
  return null;
}

function DecidableTaskRow({ task, decision, onDecide, onUndo }: { task: TaskRecord; decision: TaskDecisionPayload | undefined; onDecide: (decision: TaskDecisionPayload) => void; onUndo: () => void }) {
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [reschedulingOpen, setReschedulingOpen] = useState(false);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-line bg-inset/30 px-3.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">{task.title}</p>
          <p className="text-xs text-fg-muted">Due {formatDate(task.dueDate) || 'no date'} &middot; {formatValue(task.status)}</p>
        </div>
        {decision ? (
          <div className="flex shrink-0 items-center gap-2">
            {decisionBadge(decision)}
            <Button size="sm" variant="ghost" onClick={onUndo}>Undo</Button>
          </div>
        ) : (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setReschedulingOpen((open) => !open)}>
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              Reschedule
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDecide({ taskId: task.id, action: 'ARCHIVE' })}>
              <Archive className="h-3.5 w-3.5" aria-hidden />
              Archive
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDecide({ taskId: task.id, action: 'DELETE' })}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Delete
            </Button>
          </div>
        )}
      </div>
      {reschedulingOpen && !decision && (
        <div className="flex items-center gap-2">
          <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} aria-label={`New due date for ${task.title}`} className="w-40" />
          <Button
            size="sm"
            variant="primary"
            disabled={!rescheduleDate}
            onClick={() => { onDecide({ taskId: task.id, action: 'RESCHEDULE' as DecisionAction, newDueDate: rescheduleDate }); setReschedulingOpen(false); }}
          >
            Apply
          </Button>
        </div>
      )}
    </li>
  );
}

export function WeeklyReviewPage() {
  const navigate = useNavigate();
  const { announce } = useAnnouncement();
  const [stepIndex, setStepIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<number, TaskDecisionPayload>>({});
  const [summary, setSummary] = useState('');
  const [saveAsNote, setSaveAsNote] = useState(false);

  const draftQuery = useWeeklyReviewDraftQuery();
  const draft = draftQuery.data?.data;
  const { completeReview } = useWeeklyReviewMutations();
  const { createNote } = useNoteMutations();

  const isLoading = draftQuery.isLoading;
  const hasError = isQueryError(draftQuery.data);
  const busy = completeReview.isPending || createNote.isPending;

  const step = STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;

  const setDecision = (decision: TaskDecisionPayload) => setDecisions((prev) => ({ ...prev, [decision.taskId]: decision }));
  const undoDecision = (taskId: number) => setDecisions((prev) => { const next = { ...prev }; delete next[taskId]; return next; });

  const decisionCount = Object.keys(decisions).length;

  const finishReview = () => {
    if (!draft) return;
    const decisionList = Object.values(decisions);

    const submit = (linkedNoteId?: number) => {
      completeReview.mutate({
        weekStartDate: draft.weekStartDate,
        summary: summary.trim() || undefined,
        linkedNoteId,
        decisions: decisionList,
      }, {
        onSuccess: (result) => {
          announce(result.ok ? 'Weekly review completed.' : (result.error?.message ?? 'Could not complete the review.'));
          if (result.ok) navigate('/today');
        },
      });
    };

    if (saveAsNote && summary.trim()) {
      createNote.mutate({
        title: `Weekly review: ${draft.weekStartDate}`,
        body: summary.trim(),
        contentType: 'PLAIN_TEXT',
      }, {
        onSuccess: (result) => {
          const noteId = (result.data as { id?: number } | null)?.id;
          submit(noteId);
        },
      });
    } else {
      submit(undefined);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4" aria-busy={busy}>
      <PageHeader
        title="Weekly review"
        description={draft ? `${formatDate(draft.weekStartDate)} - ${formatDate(draft.weekEndDate)}` : "What finished, what's stuck, and what's next."}
        actions={<Button onClick={() => navigate('/today')}><ChevronLeft className="h-4 w-4" aria-hidden />Back to Today</Button>}
        className="mb-0"
      />

      <QueryState isLoading={isLoading} isError={hasError} isEmpty={false} />

      {draft && (
        <>
          <nav className="flex flex-wrap gap-1 rounded-lg bg-inset p-1" aria-label="Weekly review steps">
            {STEPS.map((s, index) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStepIndex(index)}
                aria-current={index === stepIndex ? 'step' : undefined}
                className={index === stepIndex ? 'rounded-md bg-card px-3 py-1.5 text-sm font-medium text-fg shadow-2xs' : 'rounded-md px-3 py-1.5 text-sm font-medium text-fg-muted hover:text-fg'}
              >
                {s.label}
              </button>
            ))}
          </nav>

          {step.id === 'completed' && (
            <Card aria-labelledby="review-completed-title">
              <CardHeader title={<span id="review-completed-title">Completed this week</span>} description="Work you finished." actions={<Badge variant="positive">{draft.completedTasks.length}</Badge>} />
              {draft.completedTasks.length === 0 ? <p className="text-sm text-fg-muted">Nothing completed yet this week.</p> : (
                <ul className="flex flex-col gap-2">
                  {draft.completedTasks.map((task) => (
                    <li key={task.id} className="flex items-center gap-2 rounded-lg border border-line bg-inset/30 px-3.5 py-2.5 text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-positive" aria-hidden />
                      <span className="min-w-0 truncate text-fg">{task.title}</span>
                      <span className="ml-auto shrink-0 text-xs text-fg-subtle">{formatDate(task.completedDate)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {step.id === 'overdue' && (
            <Card aria-labelledby="review-overdue-title">
              <CardHeader title={<span id="review-overdue-title">Overdue</span>} description="Decide: reschedule, archive, or delete." actions={<Badge variant="critical">{draft.overdueTasks.length}</Badge>} />
              {draft.overdueTasks.length === 0 ? <p className="text-sm text-fg-muted">Nothing overdue. Nice.</p> : (
                <ul className="flex flex-col gap-2">
                  {draft.overdueTasks.map((task) => (
                    <DecidableTaskRow key={task.id} task={task} decision={decisions[task.id]} onDecide={setDecision} onUndo={() => undoDecision(task.id)} />
                  ))}
                </ul>
              )}
            </Card>
          )}

          {step.id === 'blocked' && (
            <Card aria-labelledby="review-blocked-title">
              <CardHeader title={<span id="review-blocked-title">Blocked & waiting</span>} description="Work that needs someone else or is stuck." actions={<Badge variant="caution">{draft.blockedOrWaitingTasks.length}</Badge>} />
              {draft.blockedOrWaitingTasks.length === 0 ? <p className="text-sm text-fg-muted">Nothing blocked or waiting.</p> : (
                <ul className="flex flex-col gap-2">
                  {draft.blockedOrWaitingTasks.map((task) => (
                    <li key={task.id} className="rounded-lg border border-line bg-inset/30 px-3.5 py-2.5 text-sm">
                      <p className="font-medium text-fg">{task.title}</p>
                      <p className="text-xs text-fg-muted">{formatValue(task.status)}{task.waitingOn ? ` · Waiting on ${task.waitingOn}` : ''}{task.blockedReason ? ` · ${task.blockedReason}` : ''}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {step.id === 'habits' && (
            <Card aria-labelledby="review-habits-title">
              <CardHeader title={<span id="review-habits-title">Habit performance</span>} description="Check-ins this week against target." />
              {draft.habitPerformance.length === 0 ? <p className="text-sm text-fg-muted">No habits tracked yet.</p> : (
                <ul className="flex flex-col gap-2">
                  {draft.habitPerformance.map((habit) => (
                    <li key={habit.habitId} className="flex items-center gap-3 rounded-lg border border-line bg-inset/30 px-3.5 py-2.5 text-sm">
                      <Flame className="h-4 w-4 shrink-0 text-caution" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-fg">{habit.title}</span>
                      <span className="shrink-0 text-fg-muted tabular-nums">{habit.checkIns}/{habit.target}</span>
                      <Badge variant={habit.percent >= 80 ? 'positive' : habit.percent >= 40 ? 'caution' : 'critical'}>{habit.percent}%</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {step.id === 'projects' && (
            <Card aria-labelledby="review-projects-title">
              <CardHeader title={<span id="review-projects-title">Projects at risk</span>} description="Projects with medium or high risk." />
              {draft.projectsAtRisk.length === 0 ? <p className="text-sm text-fg-muted">No projects at risk.</p> : (
                <ul className="flex flex-col gap-2">
                  {draft.projectsAtRisk.map((project) => (
                    <li key={project.projectId} className="flex items-center gap-3 rounded-lg border border-line bg-inset/30 px-3.5 py-2.5 text-sm">
                      <FolderKanban className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-fg">{project.name}</p>
                        <p className="text-xs text-fg-muted">{project.riskReason}</p>
                      </div>
                      <Badge variant={project.riskLevel === 'HIGH' ? 'critical' : 'caution'}>{formatEnumLabel(project.riskLevel)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {step.id === 'stale' && (
            <Card aria-labelledby="review-stale-title">
              <CardHeader title={<span id="review-stale-title">Stale tasks</span>} description="Active tasks untouched for 14+ days. Decide: reschedule, archive, or delete." actions={<Badge>{draft.staleTasks.length}</Badge>} />
              {draft.staleTasks.length === 0 ? <p className="text-sm text-fg-muted">Nothing stale.</p> : (
                <ul className="flex flex-col gap-2">
                  {draft.staleTasks.map((task) => (
                    <DecidableTaskRow key={task.id} task={task} decision={decisions[task.id]} onDecide={setDecision} onUndo={() => undoDecision(task.id)} />
                  ))}
                </ul>
              )}
            </Card>
          )}

          {step.id === 'summary' && (
            <Card aria-labelledby="review-summary-title">
              <CardHeader title={<span id="review-summary-title">Plan next week & summary</span>} description={`${decisionCount} decision${decisionCount === 1 ? '' : 's'} will be applied when you finish.`} />
              <Field label="What stood out this week? What's the plan for next week?" htmlFor="reviewSummary">
                <Textarea id="reviewSummary" rows={6} value={summary} onChange={(e) => setSummary(e.target.value)} disabled={busy} placeholder="Wins, blockers, and what next week should focus on." />
              </Field>
              <Checkbox
                id="reviewSaveAsNote"
                label="Also save this summary as a note"
                checked={saveAsNote}
                onChange={(e) => setSaveAsNote(e.target.checked)}
                disabled={busy || !summary.trim()}
                className="mt-3"
              />
              <div className="mt-4 flex justify-end">
                <Button variant="primary" onClick={finishReview} disabled={busy}>
                  <Check className="h-4 w-4" aria-hidden />
                  {busy ? 'Finishing...' : 'Finish review'}
                </Button>
              </div>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <Button onClick={() => setStepIndex((index) => Math.max(0, index - 1))} disabled={isFirstStep}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Back
            </Button>
            {!isLastStep && (
              <Button variant="primary" onClick={() => setStepIndex((index) => Math.min(STEPS.length - 1, index + 1))}>
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
